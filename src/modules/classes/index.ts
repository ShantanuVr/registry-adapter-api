import { ethers } from 'ethers';
import prisma from '../../lib/database.js';
import { ClassResolveRequestSchema, ClassResolveResponseSchema } from '../../lib/schemas.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import logger from '../../lib/logger.js';

export interface ClassMapping {
  projectId: string;
  vintageStart: Date;
  vintageEnd: Date;
  classId: string;
}

export const resolveClassId = async (
  projectId: string,
  vintageStart: Date,
  vintageEnd: Date
): Promise<string> => {
  try {
    // First, try to find existing mapping
    const existing = await prisma.classMap.findFirst({
      where: {
        projectId,
        vintageStart,
        vintageEnd,
      },
    });

    if (existing) {
      logger.info({
        projectId,
        vintageStart: vintageStart.toISOString(),
        vintageEnd: vintageEnd.toISOString(),
        classId: existing.classId,
      }, 'Found existing class mapping');
      
      return existing.classId;
    }

    // Create new mapping using hash-based strategy
    const classId = generateClassId(projectId, vintageStart, vintageEnd);
    
    await prisma.classMap.create({
      data: {
        projectId,
        vintageStart,
        vintageEnd,
        classId,
      },
    });

    logger.info({
      projectId,
      vintageStart: vintageStart.toISOString(),
      vintageEnd: vintageEnd.toISOString(),
      classId,
    }, 'Created new class mapping');

    return classId;
  } catch (error) {
    logger.error({ error, projectId }, 'Failed to resolve class ID');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to resolve class ID', 500);
  }
};

export const generateClassId = (
  projectId: string,
  vintageStart: Date,
  vintageEnd: Date
): string => {
  // Hash-based strategy: keccak256(projectId|vintageStart|vintageEnd) >> 128
  const data = `${projectId}|${vintageStart.toISOString()}|${vintageEnd.toISOString()}`;
  const hash = ethers.keccak256(ethers.toUtf8Bytes(data));
  
  // Convert to BigInt, shift right 128 bits, then convert back to hex string
  const hashBigInt = BigInt(hash);
  const shifted = hashBigInt >> BigInt(128);
  const classId = shifted.toString(16).padStart(32, '0');
  
  return `0x${classId}`;
};

export const getClassMapping = async (classId: string): Promise<ClassMapping | null> => {
  try {
    const mapping = await prisma.classMap.findUnique({
      where: { classId },
    });

    if (!mapping) {
      return null;
    }

    return {
      projectId: mapping.projectId,
      vintageStart: mapping.vintageStart,
      vintageEnd: mapping.vintageEnd,
      classId: mapping.classId,
    };
  } catch (error) {
    logger.error({ error, classId }, 'Failed to get class mapping');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get class mapping', 500);
  }
};

export const validateClassMapping = (
  projectId: string,
  vintageStart: Date,
  vintageEnd: Date
): void => {
  if (!projectId || projectId.trim().length === 0) {
    throw new AppError(ErrorCode.BAD_REQUEST, 'Project ID is required', 400);
  }

  if (vintageStart >= vintageEnd) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'Vintage start date must be before end date',
      400
    );
  }

  // Check vintage window is reasonable (not more than 10 years)
  const vintageDuration = vintageEnd.getTime() - vintageStart.getTime();
  const maxDuration = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years in milliseconds
  
  if (vintageDuration > maxDuration) {
    throw new AppError(
      ErrorCode.BAD_REQUEST,
      'Vintage window cannot exceed 10 years',
      400
    );
  }
};

export const getAllClassMappings = async (): Promise<ClassMapping[]> => {
  try {
    const mappings = await prisma.classMap.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return mappings.map(mapping => ({
      projectId: mapping.projectId,
      vintageStart: mapping.vintageStart,
      vintageEnd: mapping.vintageEnd,
      classId: mapping.classId,
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to get all class mappings');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get class mappings', 500);
  }
};

export const deleteClassMapping = async (classId: string): Promise<void> => {
  try {
    const deleted = await prisma.classMap.delete({
      where: { classId },
    });

    logger.info({ classId, projectId: deleted.projectId }, 'Class mapping deleted');
  } catch (error) {
    logger.error({ error, classId }, 'Failed to delete class mapping');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to delete class mapping', 500);
  }
};
