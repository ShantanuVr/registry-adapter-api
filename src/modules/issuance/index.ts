import { ethers } from 'ethers';
import prisma from '../../lib/database.js';
import { IssuanceFinalizeRequestSchema, IssuanceFinalizeResponseSchema } from '../../lib/schemas.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { AuthContext } from '../auth/index.js';
import { getChainProvider, sendTransaction } from '../../lib/ethers.js';
import { 
  createCarbonCreditContract, 
  hashProjectId, 
  hashFactorRef, 
  createMerkleRoot,
  IssuanceData 
} from '../../lib/contracts.js';
import logger from '../../lib/logger.js';
import { resolveClassId, validateClassMapping } from '../classes/index.js';
import { storeIdempotency } from '../idemp/index.js';

export const finalizeIssuance = async (
  request: IssuanceFinalizeRequestSchema,
  authContext: AuthContext
): Promise<IssuanceFinalizeResponseSchema> => {
  const { traceId, claims } = authContext;
  
  try {
    logger.info({
      traceId,
      issuanceId: request.issuanceId,
      projectId: request.projectId,
      quantity: request.quantity,
      orgId: claims.orgId,
    }, 'Processing issuance finalization');

    // Validate vintage dates
    const vintageStart = new Date(request.vintageStart);
    const vintageEnd = new Date(request.vintageEnd);
    validateClassMapping(request.projectId, vintageStart, vintageEnd);

    // Resolve or create class ID
    const classId = request.classId || await resolveClassId(
      request.projectId,
      vintageStart,
      vintageEnd
    );

    // Validate quantity
    if (request.quantity <= 0) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Quantity must be positive', 400, traceId);
    }

    // Prepare issuance data
    const issuanceData: IssuanceData = {
      projectIdHash: hashProjectId(request.projectId),
      vintageStart: Math.floor(vintageStart.getTime() / 1000),
      vintageEnd: Math.floor(vintageEnd.getTime() / 1000),
      factorRefHash: hashFactorRef(request.factorRef),
      issuanceEvidence: createMerkleRoot(request.evidenceHashes),
    };

    // Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        type: 'MINT',
        classId,
        projectId: request.projectId,
        orgId: claims.orgId,
        quantity: request.quantity,
        factorRef: request.factorRef,
        paramsJson: {
          issuanceId: request.issuanceId,
          vintageStart: request.vintageStart,
          vintageEnd: request.vintageEnd,
          evidenceHashes: request.evidenceHashes,
        },
        status: 'PENDING',
      },
    });

    logger.info({
      traceId,
      receiptId: receipt.id,
      classId,
    }, 'Created receipt record');

    try {
      // Perform on-chain mint
      const { provider, signer } = getChainProvider();
      const contract = createCarbonCreditContract(provider);
      
      const signerAddress = await signer.getAddress();
      
      // Convert numeric classId to string for consistency
      const classIdNum = parseInt(classId);
      
      // Create proper struct for contract call
      const issuanceStruct = {
        projectIdHash: issuanceData.projectIdHash,
        vintageStart: issuanceData.vintageStart,
        vintageEnd: issuanceData.vintageEnd,
        factorRefHash: issuanceData.factorRefHash,
        issuanceEvidence: issuanceData.issuanceEvidence,
        offchainRef: request.factorRef || '',
        originClassId: ethers.zeroPadValue(ethers.toUtf8Bytes(classId), 32),
        registryURI: `${appConfig.REGISTRY_URL}/issuances/${request.issuanceId}`,
      };
      
      const tx = await contract.mint.populateTransaction(
        classIdNum,           // classId FIRST (correct order)
        signerAddress,         // to address (registry treasury) SECOND
        request.quantity,
        issuanceStruct         // Struct with all 8 fields
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
      }, 'Issuance finalized successfully');

      return {
        adapterTxId: receipt.id,
        classId,
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
      }, 'Issuance finalization failed');

      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({
      traceId,
      issuanceId: request.issuanceId,
      error,
    }, 'Unexpected error in issuance finalization');
    
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to finalize issuance', 500, traceId);
  }
};

export const validateIssuanceRequest = (
  request: IssuanceFinalizeRequestSchema,
  authContext: AuthContext
): void => {
  const { claims, traceId } = authContext;

  // Check if user can mint
  if (!['ADMIN', 'VERIFIER', 'ISSUER'].includes(claims.role)) {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to finalize issuance',
      403,
      traceId
    );
  }

  // Validate request data
  try {
    IssuanceFinalizeRequestSchema.parse(request);
  } catch (error) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request data',
      400,
      traceId
    );
  }

  // Additional business rule validations
  if (request.evidenceHashes.length === 0) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'At least one evidence hash is required',
      400,
      traceId
    );
  }

  // Check factor reference format (example validation)
  if (!request.factorRef.startsWith('FACTOR_')) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'Factor reference must start with FACTOR_',
      400,
      traceId
    );
  }
};

export const getIssuanceReceipt = async (adapterTxId: string): Promise<any> => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: adapterTxId },
    });

    if (!receipt) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Receipt not found', 404);
    }

    if (receipt.type !== 'MINT') {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Receipt is not an issuance', 400);
    }

    return receipt;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({ error, adapterTxId }, 'Failed to get issuance receipt');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get receipt', 500);
  }
};
