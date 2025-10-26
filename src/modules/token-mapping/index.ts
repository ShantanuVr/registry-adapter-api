import prisma from '../../lib/database.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import logger from '../../lib/logger.js';

export interface TokenMapping {
  classId: string;
  chainId: string;
  contractAddress: string;
  tokenId: string;
}

export interface CreateTokenMappingRequest {
  classId: string;
  chainId: string;
  contractAddress: string;
  tokenId: string;
}

export const createTokenMapping = async (
  request: CreateTokenMappingRequest
): Promise<TokenMapping> => {
  try {
    logger.info({
      classId: request.classId,
      chainId: request.chainId,
      contractAddress: request.contractAddress,
      tokenId: request.tokenId,
    }, 'Creating token mapping');

    // Check if mapping already exists
    const existing = await prisma.tokenMap.findUnique({
      where: { classId: request.classId },
    });

    if (existing) {
      logger.warn({ classId: request.classId }, 'Token mapping already exists, updating');
      
      const updated = await prisma.tokenMap.update({
        where: { classId: request.classId },
        data: {
          chainId: request.chainId,
          contractAddress: request.contractAddress,
          tokenId: request.tokenId,
        },
      });

      return {
        classId: updated.classId,
        chainId: updated.chainId,
        contractAddress: updated.contractAddress,
        tokenId: updated.tokenId,
      };
    }

    const mapping = await prisma.tokenMap.create({
      data: {
        classId: request.classId,
        chainId: request.chainId,
        contractAddress: request.contractAddress,
        tokenId: request.tokenId,
      },
    });

    logger.info({
      classId: mapping.classId,
      chainId: mapping.chainId,
    }, 'Token mapping created successfully');

    return {
      classId: mapping.classId,
      chainId: mapping.chainId,
      contractAddress: mapping.contractAddress,
      tokenId: mapping.tokenId,
    };
  } catch (error) {
    logger.error({ error, classId: request.classId }, 'Failed to create token mapping');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to create token mapping', 500);
  }
};

export const getTokenMapping = async (classId: string): Promise<TokenMapping | null> => {
  try {
    const mapping = await prisma.tokenMap.findUnique({
      where: { classId },
    });

    if (!mapping) {
      return null;
    }

    return {
      classId: mapping.classId,
      chainId: mapping.chainId,
      contractAddress: mapping.contractAddress,
      tokenId: mapping.tokenId,
    };
  } catch (error) {
    logger.error({ error, classId }, 'Failed to get token mapping');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get token mapping', 500);
  }
};

export const getAllTokenMappings = async (): Promise<TokenMapping[]> => {
  try {
    const mappings = await prisma.tokenMap.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return mappings.map(mapping => ({
      classId: mapping.classId,
      chainId: mapping.chainId,
      contractAddress: mapping.contractAddress,
      tokenId: mapping.tokenId,
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to get all token mappings');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get token mappings', 500);
  }
};

export const deleteTokenMapping = async (classId: string): Promise<void> => {
  try {
    await prisma.tokenMap.delete({
      where: { classId },
    });

    logger.info({ classId }, 'Token mapping deleted successfully');
  } catch (error) {
    logger.error({ error, classId }, 'Failed to delete token mapping');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to delete token mapping', 500);
  }
};

export const updateTokenMapping = async (
  classId: string,
  updates: Partial<CreateTokenMappingRequest>
): Promise<TokenMapping> => {
  try {
    const mapping = await prisma.tokenMap.update({
      where: { classId },
      data: updates,
    });

    logger.info({ classId }, 'Token mapping updated successfully');

    return {
      classId: mapping.classId,
      chainId: mapping.chainId,
      contractAddress: mapping.contractAddress,
      tokenId: mapping.tokenId,
    };
  } catch (error) {
    logger.error({ error, classId }, 'Failed to update token mapping');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to update token mapping', 500);
  }
};

export const resolveTokenMapping = async (classId: string): Promise<TokenMapping | null> => {
  // This is an alias for getTokenMapping but with logging
  const mapping = await getTokenMapping(classId);
  
  if (!mapping) {
    logger.warn({ classId }, 'Token mapping not found');
    return null;
  }

  logger.info({
    classId,
    chainId: mapping.chainId,
    contractAddress: mapping.contractAddress,
    tokenId: mapping.tokenId,
  }, 'Resolved token mapping');

  return mapping;
};
