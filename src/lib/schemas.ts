import { z } from 'zod';

// Common schemas
export const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');
export const HexStringSchema = z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid hex string');
export const Bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid bytes32 string');
export const CuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid CUID');
export const UuidSchema = z.string().uuid('Invalid UUID');

// JWT Claims schema
export const JWTClaimsSchema = z.object({
  sub: z.string(),
  orgId: z.string(),
  role: z.enum(['ADMIN', 'VERIFIER', 'ISSUER', 'BURNER', 'EVIDENCE', 'VIEWER']),
  iat: z.number(),
  exp: z.number(),
  iss: z.string(),
  aud: z.string().optional(),
});

export type JWTClaims = z.infer<typeof JWTClaimsSchema>;

// Idempotency Key schema
export const IdempotencyKeySchema = z.string().uuid('Invalid idempotency key');

// Issuance Finalization schemas
export const IssuanceFinalizeRequestSchema = z.object({
  issuanceId: z.string().min(1),
  projectId: z.string().min(1),
  vintageStart: z.string().datetime(),
  vintageEnd: z.string().datetime(),
  quantity: z.number().int().positive(),
  factorRef: z.string().min(1),
  evidenceHashes: z.array(z.string()).min(1),
  classId: z.string().optional(),
});

export const IssuanceFinalizeResponseSchema = z.object({
  adapterTxId: CuidSchema,
  classId: z.string(),
  quantity: z.number(),
  txHash: z.string(),
  blockNumber: z.number(),
  onchainHash: z.string(),
  receiptUrl: z.string(),
});

export type IssuanceFinalizeRequest = z.infer<typeof IssuanceFinalizeRequestSchema>;
export type IssuanceFinalizeResponse = z.infer<typeof IssuanceFinalizeResponseSchema>;

// Retirement schemas
export const RetireRequestSchema = z.object({
  classId: z.string().min(1),
  holder: AddressSchema,
  quantity: z.number().int().positive(),
  purposeHash: Bytes32Schema,
  beneficiaryHash: Bytes32Schema,
  offchainRef: z.string().optional(),
});

export const RetireResponseSchema = z.object({
  adapterTxId: CuidSchema,
  classId: z.string(),
  quantity: z.number(),
  txHash: z.string(),
  blockNumber: z.number(),
  onchainHash: z.string(),
  receiptUrl: z.string(),
});

export type RetireRequest = z.infer<typeof RetireRequestSchema>;
export type RetireResponse = z.infer<typeof RetireResponseSchema>;

// Anchor schemas
export const AnchorRequestSchema = z.object({
  topic: z.string().min(1),
  hash: Bytes32Schema,
  uri: z.string().url().optional(),
});

export const AnchorResponseSchema = z.object({
  adapterTxId: CuidSchema,
  topic: z.string(),
  hash: z.string(),
  txHash: z.string(),
  blockNumber: z.number(),
  onchainHash: z.string(),
  receiptUrl: z.string(),
});

export type AnchorRequest = z.infer<typeof AnchorRequestSchema>;
export type AnchorResponse = z.infer<typeof AnchorResponseSchema>;

// Transfer schemas (optional)
export const TransferRequestSchema = z.object({
  classId: z.string().min(1),
  from: AddressSchema,
  to: AddressSchema,
  quantity: z.number().int().positive(),
});

export const TransferResponseSchema = z.object({
  adapterTxId: CuidSchema,
  classId: z.string(),
  from: z.string(),
  to: z.string(),
  quantity: z.number(),
  txHash: z.string(),
  blockNumber: z.number(),
  onchainHash: z.string(),
  receiptUrl: z.string(),
});

export type TransferRequest = z.infer<typeof TransferRequestSchema>;
export type TransferResponse = z.infer<typeof TransferResponseSchema>;

// Receipt schemas
export const ReceiptSchema = z.object({
  id: CuidSchema,
  type: z.enum(['MINT', 'RETIRE', 'ANCHOR', 'TRANSFER']),
  classId: z.string().nullable(),
  projectId: z.string().nullable(),
  orgId: z.string().nullable(),
  quantity: z.number().nullable(),
  factorRef: z.string().nullable(),
  paramsJson: z.record(z.any()),
  txHash: z.string().nullable(),
  blockNumber: z.number().nullable(),
  onchainHash: z.string().nullable(),
  status: z.enum(['PENDING', 'MINED', 'FAILED']),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  idempotencyKey: z.string().nullable(),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

// Class resolution schemas
export const ClassResolveRequestSchema = z.object({
  projectId: z.string().min(1),
  vintageStart: z.string().datetime(),
  vintageEnd: z.string().datetime(),
});

export const ClassResolveResponseSchema = z.object({
  classId: z.string(),
  projectId: z.string(),
  vintageStart: z.string().datetime(),
  vintageEnd: z.string().datetime(),
});

export type ClassResolveRequest = z.infer<typeof ClassResolveRequestSchema>;
export type ClassResolveResponse = z.infer<typeof ClassResolveResponseSchema>;

// Health check schema
export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  db: z.boolean(),
  chain: z.boolean(),
  wallet: z.string(),
  network: z.number(),
  roles: z.array(z.string()),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    traceId: z.string().optional(),
    details: z.record(z.any()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Audit event schema
export const AuditEventSchema = z.object({
  id: CuidSchema,
  actorSub: z.string().nullable(),
  actorOrgId: z.string().nullable(),
  actorRole: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  beforeJson: z.record(z.any()).nullable(),
  afterJson: z.record(z.any()).nullable(),
  ip: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;
