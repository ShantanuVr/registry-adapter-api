import { FastifyRequest } from 'fastify';
import { ethers } from 'ethers';
import prisma from '../../lib/database.js';
import { IdempotencyKeySchema } from '../../lib/schemas.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { AuthContext } from '../auth/index.js';
import logger from '../../lib/logger.js';

export interface IdempotencyCheck {
  isReplay: boolean;
  existingReceiptId?: string;
}

export const extractIdempotencyKey = (request: FastifyRequest): string => {
  const key = request.headers['idempotency-key'] as string;
  
  if (!key) {
    throw new AppError(ErrorCode.BAD_REQUEST, 'Idempotency-Key header is required', 400);
  }
  
  try {
    return IdempotencyKeySchema.parse(key);
  } catch {
    throw new AppError(ErrorCode.BAD_REQUEST, 'Invalid Idempotency-Key format', 400);
  }
};

export const generateBodyHash = (body: any): string => {
  const bodyString = JSON.stringify(body, Object.keys(body).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(bodyString));
};

export const checkIdempotency = async (
  method: string,
  path: string,
  bodyHash: string,
  orgId: string,
  idempotencyKey: string
): Promise<IdempotencyCheck> => {
  try {
    const existing = await prisma.idempotency.findUnique({
      where: { key: idempotencyKey },
    });

    if (!existing) {
      return { isReplay: false };
    }

    // Check if the request is identical
    if (
      existing.method === method &&
      existing.path === path &&
      existing.bodyHash === bodyHash &&
      existing.orgId === orgId
    ) {
      logger.info({
        idempotencyKey,
        receiptId: existing.receiptId,
      }, 'Idempotent request detected');

      return {
        isReplay: true,
        existingReceiptId: existing.receiptId || undefined,
      };
    }

    // Different request with same key - this is an error
    throw new AppError(
      ErrorCode.IDEMPOTENT_REPLAY,
      'Idempotency key already used with different request parameters',
      409
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({ error, idempotencyKey }, 'Failed to check idempotency');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to check idempotency', 500);
  }
};

export const storeIdempotency = async (
  method: string,
  path: string,
  bodyHash: string,
  orgId: string,
  idempotencyKey: string,
  receiptId: string
): Promise<void> => {
  try {
    await prisma.idempotency.create({
      data: {
        key: idempotencyKey,
        method,
        path,
        bodyHash,
        orgId,
        receiptId,
      },
    });

    logger.info({
      idempotencyKey,
      receiptId,
    }, 'Idempotency record stored');
  } catch (error) {
    logger.error({ error, idempotencyKey }, 'Failed to store idempotency');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to store idempotency', 500);
  }
};

export const getIdempotencyMiddleware = () => {
  return async (request: FastifyRequest, reply: any) => {
    // Only apply to mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return;
    }

    try {
      const idempotencyKey = extractIdempotencyKey(request);
      const bodyHash = generateBodyHash(request.body);
      const authContext = request.authContext as AuthContext;
      
      const check = await checkIdempotency(
        request.method,
        request.routerPath,
        bodyHash,
        authContext.claims.orgId,
        idempotencyKey
      );

      if (check.isReplay && check.existingReceiptId) {
        // Return existing receipt
        const receipt = await prisma.receipt.findUnique({
          where: { id: check.existingReceiptId },
        });

        if (receipt) {
          return reply.status(200).send({
            adapterTxId: receipt.id,
            classId: receipt.classId,
            quantity: receipt.quantity,
            txHash: receipt.txHash,
            blockNumber: receipt.blockNumber,
            onchainHash: receipt.onchainHash,
            receiptUrl: `/v1/receipts/${receipt.id}`,
          });
        }
      }

      // Store request info for later idempotency storage
      request.idempotencyKey = idempotencyKey;
      request.bodyHash = bodyHash;
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            traceId: request.id,
          },
        });
      }
      throw error;
    }
  };
};

// Extend FastifyRequest type to include our custom properties
declare module 'fastify' {
  interface FastifyRequest {
    authContext?: AuthContext;
    idempotencyKey?: string;
    bodyHash?: string;
  }
}
