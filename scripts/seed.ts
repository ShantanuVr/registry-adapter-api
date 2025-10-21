import { PrismaClient } from '@prisma/client';
import logger from '../src/lib/logger.js';

const prisma = new PrismaClient();

async function seed() {
  try {
    logger.info('Starting database seed...');

    // Seed ClassMap with demo data
    const classMaps = [
      {
        projectId: 'PRJ001',
        vintageStart: new Date('2020-01-01'),
        vintageEnd: new Date('2020-12-31'),
        classId: '0x1001',
      },
      {
        projectId: 'PRJ002',
        vintageStart: new Date('2021-01-01'),
        vintageEnd: new Date('2021-12-31'),
        classId: '0x1002',
      },
      {
        projectId: 'PRJ003',
        vintageStart: new Date('2022-01-01'),
        vintageEnd: new Date('2022-12-31'),
        classId: '0x1003',
      },
    ];

    for (const classMap of classMaps) {
      await prisma.classMap.upsert({
        where: { classId: classMap.classId },
        update: {},
        create: classMap,
      });
    }

    logger.info(`Seeded ${classMaps.length} class mappings`);

    // Seed demo receipts
    const receipts = [
      {
        id: 'demo-receipt-1',
        type: 'MINT' as const,
        classId: '0x1001',
        projectId: 'PRJ001',
        orgId: 'ORG001',
        quantity: 1000,
        factorRef: 'FACTOR_001',
        paramsJson: {
          issuanceId: 'ISS001',
          vintageStart: '2020-01-01T00:00:00Z',
          vintageEnd: '2020-12-31T23:59:59Z',
          evidenceHashes: ['0xabc123', '0xdef456'],
        },
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 12345,
        onchainHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        status: 'MINED' as const,
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
      },
      {
        id: 'demo-receipt-2',
        type: 'RETIRE' as const,
        classId: '0x1001',
        orgId: 'ORG001',
        quantity: 100,
        paramsJson: {
          holder: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          purposeHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          beneficiaryHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        },
        txHash: '0x2345678901bcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
        blockNumber: 12346,
        onchainHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        status: 'MINED' as const,
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440002',
      },
      {
        id: 'demo-receipt-3',
        type: 'ANCHOR' as const,
        orgId: 'ORG001',
        paramsJson: {
          topic: 'IOT:PRJ001:2025-01-01',
          hash: '0x3456789012cdef1234567890abcdef1234567890abcdef1234567890abcdef123',
          uri: 'https://ipfs.io/ipfs/QmDemoHash',
        },
        txHash: '0x3456789012cdef1234567890abcdef1234567890abcdef1234567890abcdef123',
        blockNumber: 12347,
        onchainHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        status: 'MINED' as const,
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440003',
      },
    ];

    for (const receipt of receipts) {
      await prisma.receipt.upsert({
        where: { id: receipt.id },
        update: {},
        create: receipt,
      });
    }

    logger.info(`Seeded ${receipts.length} demo receipts`);

    // Seed idempotency records
    const idempotencyRecords = [
      {
        key: '550e8400-e29b-41d4-a716-446655440001',
        method: 'POST',
        path: '/v1/issuance/finalize',
        bodyHash: '0xhash1',
        orgId: 'ORG001',
        receiptId: 'demo-receipt-1',
      },
      {
        key: '550e8400-e29b-41d4-a716-446655440002',
        method: 'POST',
        path: '/v1/retire',
        bodyHash: '0xhash2',
        orgId: 'ORG001',
        receiptId: 'demo-receipt-2',
      },
      {
        key: '550e8400-e29b-41d4-a716-446655440003',
        method: 'POST',
        path: '/v1/anchor',
        bodyHash: '0xhash3',
        orgId: 'ORG001',
        receiptId: 'demo-receipt-3',
      },
    ];

    for (const record of idempotencyRecords) {
      await prisma.idempotency.upsert({
        where: { key: record.key },
        update: {},
        create: record,
      });
    }

    logger.info(`Seeded ${idempotencyRecords.length} idempotency records`);

    // Seed audit events
    const auditEvents = [
      {
        actorSub: 'user123',
        actorOrgId: 'ORG001',
        actorRole: 'ISSUER',
        action: 'MINT_REQUEST',
        entityType: 'ISSUANCE',
        entityId: 'ISS001',
        afterJson: { issuanceId: 'ISS001', quantity: 1000 },
        ip: '127.0.0.1',
      },
      {
        actorSub: 'user123',
        actorOrgId: 'ORG001',
        actorRole: 'BURNER',
        action: 'RETIRE_REQUEST',
        entityType: 'RETIREMENT',
        entityId: 'RET001',
        afterJson: { classId: '0x1001', quantity: 100 },
        ip: '127.0.0.1',
      },
      {
        actorSub: 'user456',
        actorOrgId: 'ORG001',
        actorRole: 'EVIDENCE',
        action: 'ANCHOR_REQUEST',
        entityType: 'ANCHOR',
        entityId: 'ANC001',
        afterJson: { topic: 'IOT:PRJ001:2025-01-01' },
        ip: '127.0.0.1',
      },
    ];

    for (const event of auditEvents) {
      await prisma.auditEvent.create({
        data: event,
      });
    }

    logger.info(`Seeded ${auditEvents.length} audit events`);

    logger.info('Database seed completed successfully');
  } catch (error) {
    logger.error({ error }, 'Database seed failed');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Seed script failed');
      process.exit(1);
    });
}

export default seed;
