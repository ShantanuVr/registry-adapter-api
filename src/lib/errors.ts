export enum ErrorCode {
  // Authentication & Authorization
  INVALID_JWT = 'INVALID_JWT',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Request Validation
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Business Logic
  POLICY_BLOCKED = 'POLICY_BLOCKED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  CLASS_NOT_FOUND = 'CLASS_NOT_FOUND',
  PROJECT_NOT_APPROVED = 'PROJECT_NOT_APPROVED',
  
  // Blockchain
  CHAIN_UNAVAILABLE = 'CHAIN_UNAVAILABLE',
  TX_REVERTED = 'TX_REVERTED',
  TX_TIMEOUT = 'TX_TIMEOUT',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  
  // Idempotency
  IDEMPOTENT_REPLAY = 'IDEMPOTENT_REPLAY',
  
  // External Services
  REGISTRY_UNAVAILABLE = 'REGISTRY_UNAVAILABLE',
  LOCKER_UNAVAILABLE = 'LOCKER_UNAVAILABLE',
  ORACLE_UNAVAILABLE = 'ORACLE_UNAVAILABLE',
  
  // Internal
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly traceId?: string;
  public readonly details?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    traceId?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.traceId = traceId;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError);
  }
}

export const createError = (
  code: ErrorCode,
  message: string,
  statusCode: number = 500,
  traceId?: string,
  details?: Record<string, any>
) => new AppError(code, message, statusCode, traceId, details);

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const getErrorResponse = (error: AppError) => ({
  error: {
    code: error.code,
    message: error.message,
    traceId: error.traceId,
    ...(error.details && { details: error.details }),
  },
});

export const getStatusCodeFromError = (error: unknown): number => {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
};
