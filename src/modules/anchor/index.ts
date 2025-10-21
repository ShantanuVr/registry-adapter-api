import { ethers } from 'ethers';
import prisma from '../../lib/database.js';
import { AnchorRequestSchema, AnchorResponseSchema } from '../../lib/schemas.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { AuthContext } from '../auth/index.js';
import { getChainProvider, sendTransaction } from '../../lib/ethers.js';
import { createEvidenceAnchorContract } from '../../lib/contracts.js';
import logger from '../../lib/logger.js';

export const anchorEvidence = async (
  request: AnchorRequestSchema,
  authContext: AuthContext
): Promise<AnchorResponseSchema> => {
  const { traceId, claims } = authContext;
  
  try {
    logger.info({
      traceId,
      topic: request.topic,
      hash: request.hash,
      orgId: claims.orgId,
    }, 'Processing evidence anchoring');

    // Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        type: 'ANCHOR',
        orgId: claims.orgId,
        paramsJson: {
          topic: request.topic,
          hash: request.hash,
          uri: request.uri,
        },
        status: 'PENDING',
      },
    });

    logger.info({
      traceId,
      receiptId: receipt.id,
    }, 'Created anchor receipt record');

    try {
      // Perform on-chain anchoring
      const { provider, signer } = getChainProvider();
      const contract = createEvidenceAnchorContract(provider);
      
      const topicHash = ethers.keccak256(ethers.toUtf8Bytes(request.topic));
      
      const tx = await contract.anchor.populateTransaction(
        topicHash,
        request.hash,
        request.uri || ''
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
      }, 'Evidence anchoring completed successfully');

      return {
        adapterTxId: receipt.id,
        topic: request.topic,
        hash: request.hash,
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
      }, 'Evidence anchoring failed');

      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({
      traceId,
      topic: request.topic,
      hash: request.hash,
      error,
    }, 'Unexpected error in evidence anchoring');
    
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to anchor evidence', 500, traceId);
  }
};

export const validateAnchorRequest = (
  request: AnchorRequestSchema,
  authContext: AuthContext
): void => {
  const { claims, traceId } = authContext;

  // Check if user can anchor evidence
  if (!['ADMIN', 'EVIDENCE'].includes(claims.role)) {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to anchor evidence',
      403,
      traceId
    );
  }

  // Validate request data
  try {
    AnchorRequestSchema.parse(request);
  } catch (error) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid request data',
      400,
      traceId
    );
  }

  // Additional business rule validations
  if (!request.topic || request.topic.trim().length === 0) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'Topic is required',
      400,
      traceId
    );
  }

  if (!request.hash || request.hash.length !== 66) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'Hash must be a valid bytes32 value',
      400,
      traceId
    );
  }

  // Validate topic format (example: IOT:PRJ001:2025-10-01 or ISSUANCE:1001)
  const topicPattern = /^(IOT|ISSUANCE|RETIREMENT):[A-Z0-9]+:[0-9-]+$/;
  if (!topicPattern.test(request.topic)) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'Topic must follow format: TYPE:ID:DATE (e.g., IOT:PRJ001:2025-10-01)',
      400,
      traceId
    );
  }
};

export const getAnchorReceipt = async (adapterTxId: string): Promise<any> => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: adapterTxId },
    });

    if (!receipt) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Receipt not found', 404);
    }

    if (receipt.type !== 'ANCHOR') {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Receipt is not an anchor', 400);
    }

    return receipt;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({ error, adapterTxId }, 'Failed to get anchor receipt');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get receipt', 500);
  }
};

export const validateTopicFormat = (topic: string): boolean => {
  const topicPattern = /^(IOT|ISSUANCE|RETIREMENT):[A-Z0-9]+:[0-9-]+$/;
  return topicPattern.test(topic);
};

export const generateTopicHash = (topic: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(topic));
};
