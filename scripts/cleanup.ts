import { PrismaClient } from '@prisma/client';
import logger from '../src/lib/logger.js';

const prisma = new PrismaClient();

async function cleanup() {
  try {
    logger.info('Starting database cleanup...');

    // Delete all records in reverse dependency order
    await prisma.auditEvent.deleteMany();
    logger.info('Cleaned audit events');

    await prisma.idempotency.deleteMany();
    logger.info('Cleaned idempotency records');

    await prisma.receipt.deleteMany();
    logger.info('Cleaned receipts');

    await prisma.classMap.deleteMany();
    logger.info('Cleaned class mappings');

    logger.info('Database cleanup completed successfully');
  } catch (error) {
    logger.error({ error }, 'Database cleanup failed');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cleanup()
    .then(() => {
      logger.info('Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Cleanup script failed');
      process.exit(1);
    });
}

export default cleanup;
