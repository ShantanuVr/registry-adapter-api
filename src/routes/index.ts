import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../modules/auth/index.js';
import { getIdempotencyMiddleware } from '../modules/idemp/index.js';
import { finalizeIssuance, validateIssuanceRequest } from '../modules/issuance/index.js';
import { retireCredits, validateRetirementRequest } from '../modules/retire/index.js';
import { anchorEvidence, validateAnchorRequest } from '../modules/anchor/index.js';
import { getReceipt } from '../modules/receipts/index.js';
import { resolveClassId } from '../modules/classes/index.js';
import { getHealthStatus, getMetrics } from '../modules/health/index.js';
import { createAuditEvent, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../modules/audit/index.js';
import { IssuanceFinalizeRequestSchema, RetireRequestSchema, AnchorRequestSchema } from '../lib/schemas.js';
import { AppError, getErrorResponse, getStatusCodeFromError } from '../lib/errors.js';
import logger from '../lib/logger.js';

export const registerRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Authentication middleware
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.authContext = await authenticateRequest(request);
    } catch (error) {
      const statusCode = getStatusCodeFromError(error);
      return reply.status(statusCode).send(getErrorResponse(error as AppError));
    }
  });

  // Idempotency middleware for mutating routes
  fastify.addHook('preHandler', getIdempotencyMiddleware());

  // Error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    const statusCode = getStatusCodeFromError(error);
    const errorResponse = getErrorResponse(error as AppError);
    
    logger.error({
      error,
      traceId: request.id,
      method: request.method,
      url: request.url,
    }, 'Request error');

    return reply.status(statusCode).send(errorResponse);
  });

  // Health check
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            db: { type: 'boolean' },
            chain: { type: 'boolean' },
            wallet: { type: 'string' },
            network: { type: 'number' },
            roles: { type: 'array', items: { type: 'string' } },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const health = await getHealthStatus();
    return reply.send(health);
  });

  // Metrics endpoint
  fastify.get('/metrics', {
    schema: {
      description: 'Prometheus metrics endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'string',
        },
      },
    },
  }, async (request, reply) => {
    const metrics = await getMetrics();
    return reply.type('text/plain').send(metrics);
  });

  // ===== CREDIT DOMAIN ENDPOINTS (Registry-facing) =====
  
  // Issuance finalization (Registry webhook)
  fastify.post('/v1/credit/issuance/finalize', {
    schema: {
      description: 'Finalize issuance and mint credits on-chain (Registry webhook)',
      tags: ['Credit Domain'],
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': { type: 'string', format: 'uuid' },
        },
        required: ['idempotency-key'],
      },
      body: {
        type: 'object',
        properties: {
          issuanceId: { type: 'string' },
          projectId: { type: 'string' },
          vintageStart: { type: 'string', format: 'date-time' },
          vintageEnd: { type: 'string', format: 'date-time' },
          quantity: { type: 'number', minimum: 1 },
          factorRef: { type: 'string' },
          evidenceHashes: { type: 'array', items: { type: 'string' } },
          classId: { type: 'string' },
        },
        required: ['issuanceId', 'projectId', 'vintageStart', 'vintageEnd', 'quantity', 'factorRef', 'evidenceHashes'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['credit'] },
            sourceOfRecord: { type: 'string', enum: ['registry'] },
            adapterTxId: { type: 'string' },
            classId: { type: 'string' },
            quantity: { type: 'number' },
            txHash: { type: 'string' },
            blockNumber: { type: 'number' },
            onchainHash: { type: 'string' },
            receiptUrl: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: IssuanceFinalizeRequestSchema }>, reply) => {
    const authContext = request.authContext!;
    
    // Validate request
    validateIssuanceRequest(request.body, authContext);
    
    // Create audit event
    await createAuditEvent(authContext, {
      action: AUDIT_ACTIONS.MINT_REQUEST,
      entityType: AUDIT_ENTITY_TYPES.ISSUANCE,
      entityId: request.body.issuanceId,
      afterJson: request.body,
      ip: request.ip,
    });

    // Process issuance
    const result = await finalizeIssuance(request.body, authContext);
    
    // Add domain and source of record
    const response = {
      domain: 'credit',
      sourceOfRecord: 'registry',
      ...result
    };
    
    // Store idempotency
    if (request.idempotencyKey && request.bodyHash) {
      // This would be handled by the idempotency middleware
    }

    return reply.status(201).send(response);
  });

  // Credit retirement (Registry webhook)
  fastify.post('/v1/credit/retire', {
    schema: {
      description: 'Retire/burn credits on-chain (Registry webhook)',
      tags: ['Credit Domain'],
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': { type: 'string', format: 'uuid' },
        },
        required: ['idempotency-key'],
      },
      body: {
        type: 'object',
        properties: {
          classId: { type: 'string' },
          holder: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          quantity: { type: 'number', minimum: 1 },
          purposeHash: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
          beneficiaryHash: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
          offchainRef: { type: 'string' },
        },
        required: ['classId', 'holder', 'quantity', 'purposeHash', 'beneficiaryHash'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['credit'] },
            sourceOfRecord: { type: 'string', enum: ['registry'] },
            adapterTxId: { type: 'string' },
            classId: { type: 'string' },
            quantity: { type: 'number' },
            txHash: { type: 'string' },
            blockNumber: { type: 'number' },
            onchainHash: { type: 'string' },
            receiptUrl: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: RetireRequestSchema }>, reply) => {
    const authContext = request.authContext!;
    
    // Validate request
    validateRetirementRequest(request.body, authContext);
    
    // Create audit event
    await createAuditEvent(authContext, {
      action: AUDIT_ACTIONS.RETIRE_REQUEST,
      entityType: AUDIT_ENTITY_TYPES.RETIREMENT,
      entityId: request.body.classId,
      afterJson: request.body,
      ip: request.ip,
    });

    // Process retirement
    const result = await retireCredits(request.body, authContext);
    
    // Add domain and source of record
    const response = {
      domain: 'credit',
      sourceOfRecord: 'registry',
      ...result
    };
    
    return reply.status(201).send(response);
  });

  // ===== TOKEN DOMAIN ENDPOINTS (Internal/Admin only) =====
  
  // Token minting (Admin CLI only)
  fastify.post('/v1/token/mint', {
    schema: {
      description: 'Mint tokens on-chain (Admin CLI only)',
      tags: ['Token Domain'],
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': { type: 'string', format: 'uuid' },
        },
        required: ['idempotency-key'],
      },
      body: {
        type: 'object',
        properties: {
          classId: { type: 'string' },
          to: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          quantity: { type: 'number', minimum: 1 },
          chainId: { type: 'string' },
          contractAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          tokenId: { type: 'string' },
        },
        required: ['classId', 'to', 'quantity', 'chainId', 'contractAddress'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['token'] },
            sourceOfRecord: { type: 'string', enum: ['chain'] },
            adapterTxId: { type: 'string' },
            classId: { type: 'string' },
            quantity: { type: 'number' },
            txHash: { type: 'string' },
            blockNumber: { type: 'number' },
            onchainHash: { type: 'string' },
            receiptUrl: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: any }>, reply) => {
    const authContext = request.authContext!;
    
    // Only allow ADMIN role for token operations
    if (authContext.role !== 'ADMIN') {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Token operations are restricted to ADMIN role only',
        },
      });
    }
    
    // Process token minting
    const result = await finalizeIssuance(request.body, authContext);
    
    // Add domain and source of record
    const response = {
      domain: 'token',
      sourceOfRecord: 'chain',
      ...result
    };
    
    return reply.status(201).send(response);
  });

  // Token burning (Admin CLI only)
  fastify.post('/v1/token/burn', {
    schema: {
      description: 'Burn tokens on-chain (Admin CLI only)',
      tags: ['Token Domain'],
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': { type: 'string', format: 'uuid' },
        },
        required: ['idempotency-key'],
      },
      body: {
        type: 'object',
        properties: {
          classId: { type: 'string' },
          from: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          quantity: { type: 'number', minimum: 1 },
          chainId: { type: 'string' },
          contractAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          tokenId: { type: 'string' },
        },
        required: ['classId', 'from', 'quantity', 'chainId', 'contractAddress'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['token'] },
            sourceOfRecord: { type: 'string', enum: ['chain'] },
            adapterTxId: { type: 'string' },
            classId: { type: 'string' },
            quantity: { type: 'number' },
            txHash: { type: 'string' },
            blockNumber: { type: 'number' },
            onchainHash: { type: 'string' },
            receiptUrl: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: any }>, reply) => {
    const authContext = request.authContext!;
    
    // Only allow ADMIN role for token operations
    if (authContext.role !== 'ADMIN') {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Token operations are restricted to ADMIN role only',
        },
      });
    }
    
    // Process token burning
    const result = await retireCredits(request.body, authContext);
    
    // Add domain and source of record
    const response = {
      domain: 'token',
      sourceOfRecord: 'chain',
      ...result
    };
    
    return reply.status(201).send(response);
  });

  // Token bridging (Admin CLI only)
  fastify.post('/v1/token/bridge', {
    schema: {
      description: 'Bridge tokens between chains (Admin CLI only)',
      tags: ['Token Domain'],
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': { type: 'string', format: 'uuid' },
        },
        required: ['idempotency-key'],
      },
      body: {
        type: 'object',
        properties: {
          classId: { type: 'string' },
          fromChainId: { type: 'string' },
          toChainId: { type: 'string' },
          fromContract: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          toContract: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          quantity: { type: 'number', minimum: 1 },
          tokenId: { type: 'string' },
        },
        required: ['classId', 'fromChainId', 'toChainId', 'fromContract', 'toContract', 'quantity'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['token'] },
            sourceOfRecord: { type: 'string', enum: ['chain'] },
            adapterTxId: { type: 'string' },
            classId: { type: 'string' },
            quantity: { type: 'number' },
            txHash: { type: 'string' },
            blockNumber: { type: 'number' },
            onchainHash: { type: 'string' },
            receiptUrl: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: any }>, reply) => {
    const authContext = request.authContext!;
    
    // Only allow ADMIN role for token operations
    if (authContext.role !== 'ADMIN') {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Token operations are restricted to ADMIN role only',
        },
      });
    }
    
    // Process token bridging (mock implementation)
    const result = {
      adapterTxId: 'c' + Math.random().toString(36).substr(2, 24),
      classId: request.body.classId,
      quantity: request.body.quantity,
      txHash: '0x' + Math.random().toString(16).substr(2, 64),
      blockNumber: Math.floor(Math.random() * 1000000),
      onchainHash: '0x' + Math.random().toString(16).substr(2, 64),
      receiptUrl: `/v1/receipts/c${Math.random().toString(36).substr(2, 24)}`,
    };
    
    // Add domain and source of record
    const response = {
      domain: 'token',
      sourceOfRecord: 'chain',
      ...result
    };
    
    return reply.status(201).send(response);
  });

  // ===== SHARED ENDPOINTS =====

  // Evidence anchoring
  fastify.post('/v1/anchor', {
    schema: {
      description: 'Anchor evidence hash on-chain',
      tags: ['Evidence'],
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': { type: 'string', format: 'uuid' },
        },
        required: ['idempotency-key'],
      },
      body: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          hash: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' },
          uri: { type: 'string', format: 'uri' },
        },
        required: ['topic', 'hash'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            adapterTxId: { type: 'string' },
            topic: { type: 'string' },
            hash: { type: 'string' },
            txHash: { type: 'string' },
            blockNumber: { type: 'number' },
            onchainHash: { type: 'string' },
            receiptUrl: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: AnchorRequestSchema }>, reply) => {
    const authContext = request.authContext!;
    
    // Validate request
    validateAnchorRequest(request.body, authContext);
    
    // Create audit event
    await createAuditEvent(authContext, {
      action: AUDIT_ACTIONS.ANCHOR_REQUEST,
      entityType: AUDIT_ENTITY_TYPES.ANCHOR,
      entityId: request.body.topic,
      afterJson: request.body,
      ip: request.ip,
    });

    // Process anchoring
    const result = await anchorEvidence(request.body, authContext);
    
    return reply.status(201).send(result);
  });

  // Get receipt
  fastify.get('/v1/receipts/:adapterTxId', {
    schema: {
      description: 'Get receipt by adapter transaction ID',
      tags: ['Receipts'],
      params: {
        type: 'object',
        properties: {
          adapterTxId: { type: 'string' },
        },
        required: ['adapterTxId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['MINT', 'RETIRE', 'ANCHOR', 'TRANSFER'] },
            classId: { type: 'string' },
            projectId: { type: 'string' },
            orgId: { type: 'string' },
            quantity: { type: 'number' },
            factorRef: { type: 'string' },
            paramsJson: { type: 'object' },
            txHash: { type: 'string' },
            blockNumber: { type: 'number' },
            onchainHash: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'MINED', 'FAILED'] },
            errorCode: { type: 'string' },
            errorMessage: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            idempotencyKey: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { adapterTxId: string } }>, reply) => {
    const { adapterTxId } = request.params;
    const receipt = await getReceipt(adapterTxId);
    return reply.send(receipt);
  });

  // Class mapping management (Admin CLI only)
  fastify.post('/v1/classes/map', {
    schema: {
      description: 'Create deterministic mapping classId -> {chainId, contract, tokenId} (Admin CLI only)',
      tags: ['Classes'],
      headers: {
        type: 'object',
        properties: {
          'idempotency-key': { type: 'string', format: 'uuid' },
        },
        required: ['idempotency-key'],
      },
      body: {
        type: 'object',
        properties: {
          classId: { type: 'string' },
          chainId: { type: 'string' },
          contractAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          tokenId: { type: 'string' },
        },
        required: ['classId', 'chainId', 'contractAddress'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['credit'] },
            sourceOfRecord: { type: 'string', enum: ['registry'] },
            classId: { type: 'string' },
            chainId: { type: 'string' },
            contractAddress: { type: 'string' },
            tokenId: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: any }>, reply) => {
    const authContext = request.authContext!;
    
    // Only allow ADMIN role for mapping operations
    if (authContext.role !== 'ADMIN') {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Class mapping operations are restricted to ADMIN role only',
        },
      });
    }
    
    // Store mapping in database (mock implementation)
    const mapping = {
      classId: request.body.classId,
      chainId: request.body.chainId,
      contractAddress: request.body.contractAddress,
      tokenId: request.body.tokenId,
      createdAt: new Date().toISOString(),
    };
    
    // Add domain and source of record
    const response = {
      domain: 'credit',
      sourceOfRecord: 'registry',
      ...mapping
    };
    
    return reply.status(201).send(response);
  });

  // Get class mapping
  fastify.get('/v1/classes/map/:classId', {
    schema: {
      description: 'Get deterministic mapping for classId',
      tags: ['Classes'],
      params: {
        type: 'object',
        properties: {
          classId: { type: 'string' },
        },
        required: ['classId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['credit'] },
            sourceOfRecord: { type: 'string', enum: ['registry'] },
            classId: { type: 'string' },
            chainId: { type: 'string' },
            contractAddress: { type: 'string' },
            tokenId: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { classId: string } }>, reply) => {
    const { classId } = request.params;
    
    // Get mapping from database (mock implementation)
    const mapping = {
      classId,
      chainId: '137', // Polygon mainnet
      contractAddress: '0x' + Math.random().toString(16).substr(2, 40),
      tokenId: Math.random().toString(),
      createdAt: new Date().toISOString(),
    };
    
    // Add domain and source of record
    const response = {
      domain: 'credit',
      sourceOfRecord: 'registry',
      ...mapping
    };
    
    return reply.send(response);
  });

  // Class resolution
  fastify.get('/v1/classes/resolve', {
    schema: {
      description: 'Resolve class ID for project and vintage',
      tags: ['Classes'],
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          vintageStart: { type: 'string', format: 'date-time' },
          vintageEnd: { type: 'string', format: 'date-time' },
        },
        required: ['projectId', 'vintageStart', 'vintageEnd'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            classId: { type: 'string' },
            projectId: { type: 'string' },
            vintageStart: { type: 'string' },
            vintageEnd: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { projectId: string; vintageStart: string; vintageEnd: string } }>, reply) => {
    const { projectId, vintageStart, vintageEnd } = request.query;
    
    const classId = await resolveClassId(
      projectId,
      new Date(vintageStart),
      new Date(vintageEnd)
    );
    
    return reply.send({
      classId,
      projectId,
      vintageStart,
      vintageEnd,
    });
  });

  // Transaction status
  fastify.get('/v1/tx/:txHash', {
    schema: {
      description: 'Get transaction status by hash',
      tags: ['Transactions'],
      params: {
        type: 'object',
        properties: {
          txHash: { type: 'string' },
        },
        required: ['txHash'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            txHash: { type: 'string' },
            blockNumber: { type: 'number' },
            status: { type: 'string' },
            gasUsed: { type: 'string' },
            confirmations: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { txHash: string } }>, reply) => {
    const { txHash } = request.params;
    
    // This would check the actual transaction status on-chain
    // For demo purposes, return mock data
    return reply.send({
      txHash,
      blockNumber: 12345,
      status: 'success',
      gasUsed: '21000',
      confirmations: 1,
    });
  });
};
