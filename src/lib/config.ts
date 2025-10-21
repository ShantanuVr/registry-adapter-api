import { config } from 'dotenv';
import { z } from 'zod';

config();

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4100),
  
  // Database
  DATABASE_URL: z.string().min(1),
  
  // JWT Configuration
  JWT_JWKS_URL: z.string().url(),
  JWT_ISSUER: z.string().url(),
  
  // Blockchain Configuration
  CHAIN_RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number(),
  SIGNER_PRIV: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  TOKENS_CREDIT1155_ADDR: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  EVIDENCE_ANCHOR_ADDR: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  
  // External Services
  REGISTRY_URL: z.string().url(),
  EVIDENCE_LOCKER_URL: z.string().url(),
  IOT_ORACLE_URL: z.string().url(),
  
  // Feature Flags
  ENABLE_REGISTRY_CALLBACK: z.coerce.boolean().default(false),
  READONLY_MODE: z.coerce.boolean().default(false),
  MOCK_CHAIN: z.coerce.boolean().default(false),
  MOCK_LOCKER: z.coerce.boolean().default(false),
  MOCK_ORACLE: z.coerce.boolean().default(false),
  
  // Configuration
  CONFIRMATIONS: z.coerce.number().min(1).default(1),
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().min(1).default(24),
  MAX_QUANTITY_PER_ISSUANCE: z.coerce.number().min(1).default(1000000),
  
  // Security
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().min(1).default(100),
  RATE_LIMIT_TIME_WINDOW: z.coerce.number().min(1000).default(60000),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

export const appConfig = ConfigSchema.parse(process.env);

export default appConfig;
