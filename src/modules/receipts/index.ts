import prisma from '../../lib/database.js';
import { ReceiptSchema } from '../../lib/schemas.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import logger from '../../lib/logger.js';

export const getReceipt = async (adapterTxId: string): Promise<any> => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: adapterTxId },
    });

    if (!receipt) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'Receipt not found', 404);
    }

    return receipt;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({ error, adapterTxId }, 'Failed to get receipt');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get receipt', 500);
  }
};

export const getReceiptsByOrg = async (orgId: string, limit: number = 100): Promise<any[]> => {
  try {
    const receipts = await prisma.receipt.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return receipts;
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to get receipts by org');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get receipts', 500);
  }
};

export const getReceiptsByType = async (type: string, limit: number = 100): Promise<any[]> => {
  try {
    const receipts = await prisma.receipt.findMany({
      where: { type: type as any },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return receipts;
  } catch (error) {
    logger.error({ error, type }, 'Failed to get receipts by type');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get receipts', 500);
  }
};

export const getReceiptsByStatus = async (status: string, limit: number = 100): Promise<any[]> => {
  try {
    const receipts = await prisma.receipt.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return receipts;
  } catch (error) {
    logger.error({ error, status }, 'Failed to get receipts by status');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get receipts', 500);
  }
};

export const getAllReceipts = async (limit: number = 100): Promise<any[]> => {
  try {
    const receipts = await prisma.receipt.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return receipts;
  } catch (error) {
    logger.error({ error }, 'Failed to get all receipts');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to get receipts', 500);
  }
};

export const updateReceiptStatus = async (
  adapterTxId: string,
  status: 'PENDING' | 'MINED' | 'FAILED',
  errorCode?: string,
  errorMessage?: string
): Promise<void> => {
  try {
    await prisma.receipt.update({
      where: { id: adapterTxId },
      data: {
        status,
        errorCode,
        errorMessage,
        updatedAt: new Date(),
      },
    });

    logger.info({
      adapterTxId,
      status,
      errorCode,
    }, 'Receipt status updated');
  } catch (error) {
    logger.error({ error, adapterTxId }, 'Failed to update receipt status');
    throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to update receipt', 500);
  }
};
