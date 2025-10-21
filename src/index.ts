import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { appConfig } from './lib/config.js';
import logger from './lib/logger.js';
import { connectDatabase, disconnectDatabase } from './lib/database.js';
import { initializeChainProvider } from './lib/ethers.js';
import { registerRoutes } from './routes/index.js';

const buildApp = async () => {
  const fastify = Fastify({
    logger: logger.child({ service: 'registry-adapter-api' }),
    genReqId: () => crypto.randomUUID(),
  });

  // Security middleware
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for API
  });

  await fastify.register(cors, {
    origin: appConfig.CORS_ORIGIN,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: appConfig.RATE_LIMIT_MAX,
    timeWindow: appConfig.RATE_LIMIT_TIME_WINDOW,
  });

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Registry Adapter API',
        description: 'Bridge between Official Registry & Chain - Production-quality adapter service',
        version: '1.0.0',
        contact: {
          name: 'Carbon Credit Registry Team',
          email: 'support@carboncredit.example.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${appConfig.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token from registry',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check and metrics' },
        { name: 'Issuance', description: 'Credit issuance operations' },
        { name: 'Retirement', description: 'Credit retirement operations' },
        { name: 'Evidence', description: 'Evidence anchoring operations' },
        { name: 'Receipts', description: 'Transaction receipts' },
        { name: 'Classes', description: 'Class mapping operations' },
        { name: 'Transactions', description: 'Transaction status' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // Register routes
  await registerRoutes(fastify);

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    
    try {
      await fastify.close();
      await disconnectDatabase();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return fastify;
};

export const start = async () => {
  try {
    logger.info('Starting Registry Adapter API...');

    // Initialize database
    await connectDatabase();

    // Initialize chain provider
    await initializeChainProvider();

    // Build and start server
    const app = await buildApp();
    
    await app.listen({
      port: appConfig.PORT,
      host: '0.0.0.0',
    });

    logger.info({
      port: appConfig.PORT,
      docs: `http://localhost:${appConfig.PORT}/docs`,
      health: `http://localhost:${appConfig.PORT}/health`,
    }, 'Registry Adapter API started successfully');

  } catch (error) {
    logger.error({ error }, 'Failed to start Registry Adapter API');
    process.exit(1);
  }
};

export default buildApp;
