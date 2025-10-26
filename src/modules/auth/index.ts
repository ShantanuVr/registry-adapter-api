import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-client';
import { FastifyRequest } from 'fastify';
import { appConfig } from '../../lib/config';
import { JWTClaimsSchema, JWTClaims } from '../../lib/schemas';
import { AppError, ErrorCode } from '../../lib/errors';
import logger from '../../lib/logger';

export interface AuthContext {
  claims: JWTClaims;
  traceId: string;
  role?: string;
}

// JWKS client for JWT verification
const client = jwksClient({
  jwksUri: appConfig.JWT_JWKS_URL,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

const getKey = (header: jwt.JwtHeader): Promise<string> => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(header.kid!, (err: any, key: any) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        reject(new Error('Unable to find a signing key'));
        return;
      }
      resolve(signingKey);
    });
  });
};

export const verifyJWT = async (token: string): Promise<JWTClaims> => {
  try {
    const decoded = jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      issuer: appConfig.JWT_ISSUER,
      audience: 'registry-adapter-api',
    }) as unknown as jwt.JwtPayload;

    const claims = JWTClaimsSchema.parse(decoded);
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      throw new AppError(ErrorCode.INVALID_JWT, 'Token has expired', 401);
    }

    return claims;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error({ error }, 'JWT verification failed');
    throw new AppError(ErrorCode.INVALID_JWT, 'Invalid JWT token', 401);
  }
};

export const extractBearerToken = (request: FastifyRequest): string => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Missing or invalid Authorization header', 401);
  }
  
  return authHeader.substring(7);
};

export const authenticateRequest = async (request: FastifyRequest): Promise<AuthContext> => {
  const traceId = request.id as string;
  
  try {
    const token = extractBearerToken(request);
    const claims = await verifyJWT(token);
    
    return {
      claims,
      traceId,
    };
  } catch (error) {
    logger.error({ traceId, error }, 'Authentication failed');
    throw error;
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (authContext: AuthContext): void => {
    if (!allowedRoles.includes(authContext.claims.role)) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
        403,
        authContext.traceId
      );
    }
  };
};

export const requireOrg = (orgId: string) => {
  return (authContext: AuthContext): void => {
    if (authContext.claims.orgId !== orgId && authContext.claims.role !== 'ADMIN') {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Access denied for this organization',
        403,
        authContext.traceId
      );
    }
  };
};

export const canMint = (authContext: AuthContext): boolean => {
  return ['ADMIN', 'VERIFIER', 'ISSUER'].includes(authContext.claims.role);
};

export const canRetire = (authContext: AuthContext): boolean => {
  return ['ADMIN', 'ISSUER', 'BURNER'].includes(authContext.claims.role);
};

export const canAnchor = (authContext: AuthContext): boolean => {
  return ['ADMIN', 'EVIDENCE'].includes(authContext.claims.role);
};

export const canTransfer = (authContext: AuthContext): boolean => {
  return ['ADMIN', 'ISSUER'].includes(authContext.claims.role);
};

export const canView = (authContext: AuthContext): boolean => {
  return ['ADMIN', 'VERIFIER', 'ISSUER', 'BURNER', 'EVIDENCE', 'VIEWER'].includes(authContext.claims.role);
};

// Optional HMAC app key verification for machine-to-machine
export const verifyAppKey = (request: FastifyRequest): boolean => {
  const appKey = request.headers['x-app-key'] as string;
  const appSig = request.headers['x-app-sig'] as string;
  
  if (!appKey || !appSig) {
    return false;
  }
  
  // In a real implementation, verify HMAC signature
  // For demo purposes, accept any non-empty values
  return appKey.length > 0 && appSig.length > 0;
};

export const authenticateAppKey = (request: FastifyRequest): void => {
  if (!verifyAppKey(request)) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid app key signature', 401);
  }
};
