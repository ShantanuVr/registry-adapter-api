import { appConfig } from '../../lib/config.js';
import { getChainProvider, getSignerAddress, getSignerRoles } from '../../lib/ethers.js';
import { HealthResponseSchema } from '../../lib/schemas.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import logger from '../../lib/logger.js';
import prisma from '../../lib/database.js';

export const getHealthStatus = async (): Promise<HealthResponseSchema> => {
  try {
    // Check database connection
    let dbHealthy = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
    } catch (error) {
      logger.error({ error }, 'Database health check failed');
    }

    // Check chain connection
    let chainHealthy = false;
    let walletAddress = '';
    let networkId = 0;
    let roles: string[] = [];
    
    try {
      const { provider, network } = getChainProvider();
      await provider.getBlockNumber();
      chainHealthy = true;
      walletAddress = await getSignerAddress();
      networkId = Number(network.chainId);
      roles = await getSignerRoles();
    } catch (error) {
      logger.error({ error }, 'Chain health check failed');
    }

    const isHealthy = dbHealthy && chainHealthy;

    logger.info({
      dbHealthy,
      chainHealthy,
      walletAddress,
      networkId,
      roles,
    }, 'Health check completed');

    return {
      ok: isHealthy,
      db: dbHealthy,
      chain: chainHealthy,
      wallet: walletAddress,
      network: networkId,
      roles,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Health check failed', 500);
  }
};

export const getMetrics = async (): Promise<string> => {
  try {
    // Basic Prometheus metrics
    const metrics = [
      '# HELP registry_adapter_health Database and chain health status',
      '# TYPE registry_adapter_health gauge',
      `registry_adapter_health{component="database"} ${await getDatabaseHealth() ? 1 : 0}`,
      `registry_adapter_health{component="chain"} ${await getChainHealth() ? 1 : 0}`,
      '',
      '# HELP registry_adapter_receipts_total Total number of receipts',
      '# TYPE registry_adapter_receipts_total counter',
      `registry_adapter_receipts_total{type="mint"} ${await getReceiptCount('MINT')}`,
      `registry_adapter_receipts_total{type="retire"} ${await getReceiptCount('RETIRE')}`,
      `registry_adapter_receipts_total{type="anchor"} ${await getReceiptCount('ANCHOR')}`,
      `registry_adapter_receipts_total{type="transfer"} ${await getReceiptCount('TRANSFER')}`,
      '',
      '# HELP registry_adapter_receipts_by_status Total receipts by status',
      '# TYPE registry_adapter_receipts_by_status counter',
      `registry_adapter_receipts_by_status{status="pending"} ${await getReceiptCountByStatus('PENDING')}`,
      `registry_adapter_receipts_by_status{status="mined"} ${await getReceiptCountByStatus('MINED')}`,
      `registry_adapter_receipts_by_status{status="failed"} ${await getReceiptCountByStatus('FAILED')}`,
    ];

    return metrics.join('\n');
  } catch (error) {
    logger.error({ error }, 'Failed to generate metrics');
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to generate metrics', 500);
  }
};

const getDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};

const getChainHealth = async (): Promise<boolean> => {
  try {
    const { provider } = getChainProvider();
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
};

const getReceiptCount = async (type: string): Promise<number> => {
  try {
    const count = await prisma.receipt.count({
      where: { type: type as any },
    });
    return count;
  } catch {
    return 0;
  }
};

const getReceiptCountByStatus = async (status: string): Promise<number> => {
  try {
    const count = await prisma.receipt.count({
      where: { status: status as any },
    });
    return count;
  } catch {
    return 0;
  }
};
