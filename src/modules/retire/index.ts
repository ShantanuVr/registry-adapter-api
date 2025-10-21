import { ethers } from 'ethers';
import prisma from '../../lib/database.js';
import { RetireRequestSchema, RetireResponseSchema } from '../../lib/schemas.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { AuthContext } from '../auth/index.js';
import { getChainProvider, sendTransaction, getBalance } from '../../lib/ethers.js';
import { 
  createCarbonCreditContract, 
  encodeRetirementData, 
  hashPurpose, 
  hashBeneficiary,
  RetirementData 
} from '../../lib/contracts.js';
import logger from '../../lib/logger.js';

export const retireCredits = async (
  request: RetireRequestSchema,
  authContext: AuthContext
): Promise<RetireResponseSchema> => {
  const { traceId, claims } = authContext;
  
  try {
    logger.info({
      traceId,
      classId: request.classId,
      holder: request.holder,
      quantity: request.quantity,
      orgId: claims.orgId,
    }, 'Processing credit retirement');

    // Validate quantity
    if (request.quantity <= 0) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Quantity must be positive', 400, traceId);
    }

    // Check holder balance (preflight check)
    const balance = await getBalance(request.holder, request.classId);
    if (balance < BigInt(request.quantity)) {
      throw new AppError(
        ErrorCode.INSUFFICIENT_BALANCE,
        `Insufficient balance. Holder has ${balance.toString()}, requested ${request.quantity}`,
        400,
        traceId
      );
    }

    // Prepare retirement data
    const retirementData: RetirementData = {
      purposeHash: request.purposeHash,
      beneficiaryHash: request.beneficiaryHash,
      offchainRef: request.offchainRef,
    };

    // Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        type: 'RETIRE',
        classId: request.classId,
        orgId: claims.orgId,
        quantity: request.quantity,
        paramsJson: {
          holder: request.holder,
          purposeHash: request.purposeHash,
          beneficiaryHash: request.beneficiaryHash,
          offchainRef: request.offchainRef,
        },
        status: 'PENDING',
      },
    });

    logger.info({
      traceId,
      receiptId: receipt.id,
      classId: request.classId,
    }, 'Created retirement receipt record');

    try {
      // Perform on-chain retirement
      const { provider, signer } = getChainProvider();
      const contract = createCarbonCreditContract(provider);
      
      const encodedData = encodeRetirementData(retirementData);
      
      const tx = await contract.retire.populateTransaction(
        request.classId,
        request.quantity,
        encodedData
      );

      const result = await sendTransaction(tx);

      // Update receipt with transaction details
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          onchainHash: result.onchainHash,
          status: 'MINED',
        },
      });

      logger.info({
        traceId,
        receiptId: receipt.id,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
      }, 'Credit retirement completed successfully');

      return {
        adapterTxId: receipt.id,
        classId: request.classId,
        quantity: request.quantity,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        onchainHash: result.onchainHash || '',
        receiptUrl: `/v1/receipts/${receipt.id}`,
      };
    } catch (error) {
      // Update receipt with error
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          status: 'FAILED',
          errorCode: error instanceof AppError ? error.code : ErrorCode.TX_REVERTED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      logger.error({
        traceId,
        receiptId: receipt.id,
        error,
      }, 'Credit retirement failed');

      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({
      traceId,
      classId: request.classId,
      holder: request.holder,
      error,
    }, 'Unexpected error in credit retirement');
    
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to retire credits', 500, traceId);
  }
};

export const validateRetirementRequest = (
  request: RetireRequestSchema,
  authContext: AuthContext
): void => {
  const { claims, traceId } = authContext;

  // Check if user can retire
  if (!['ADMIN', 'ISSUER', 'BURNER'].includes(claims.role)) {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to retire credits',
      403,
      traceId
    );
  }

  // Validate request data
  try {
    RetireRequestSchema.parse(request);
  } catch (error) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request data',
      400,
      traceId
    );
  }

  // Additional business rule validations
  if (!request.purposeHash || request.purposeHash.length !== 66) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'Purpose hash must be a valid bytes32 value',
      400,
      traceId
    );
  }

  if (!request.beneficiaryHash || request.beneficiaryHash.length !== 66) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'Beneficiary hash must be a valid bytes32 value',
      400,
      traceId
    );
  }
};

export const getRetirementReceipt = async (adapterTxId: string): Promise<any> => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: adapterTxId },
    });

    if (!receipt) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Receipt not found', 404);
    }

    if (receipt.type !== 'RETIRE') {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Receipt is not a retirement', 400);
    }

    return receipt;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({ error, adapterTxId }, 'Failed to get retirement receipt');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get receipt', 500);
  }
};

export const validateHolderBalance = async (
  holder: string,
  classId: string,
  quantity: number
): Promise<void> => {
  try {
    const balance = await getBalance(holder, classId);
    
    if (balance < BigInt(quantity)) {
      throw new AppError(
        ErrorCode.INSUFFICIENT_BALANCE,
        `Insufficient balance. Holder has ${balance.toString()}, requested ${quantity}`,
        400
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({ error, holder, classId }, 'Failed to validate holder balance');
    throw new AppError(ErrorCode.CHAIN_UNAVAILABLE, 'Failed to check balance', 500);
  }
};
