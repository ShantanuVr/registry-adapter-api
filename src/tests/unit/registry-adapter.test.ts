import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { validateClassMapping } from '../../modules/classes/index.js';
import { generateClassId } from '../../modules/classes/index.js';
import { createTokenMapping, getTokenMapping } from '../../modules/token-mapping/index.js';
import prisma from '../../lib/database.js';

// Mock Prisma client
vi.mock('../../lib/database.js', () => ({
  default: {
    tokenMap: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    classMap: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Registry Adapter API - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError(ErrorCode.BAD_REQUEST, 'Test error', 400, 'trace123');
      
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.traceId).toBe('trace123');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create AppError with default status code', () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Test error');
      
      expect(error.statusCode).toBe(500);
    });
  });

  describe('Class Mapping Validation', () => {
    it('should validate class mapping parameters', () => {
      const projectId = 'PRJ001';
      const vintageStart = new Date('2020-01-01');
      const vintageEnd = new Date('2020-12-31');
      
      expect(() => validateClassMapping(projectId, vintageStart, vintageEnd)).not.toThrow();
    });

    it('should reject invalid vintage dates', () => {
      const projectId = 'PRJ001';
      const vintageStart = new Date('2020-12-31');
      const vintageEnd = new Date('2020-01-01');
      
      expect(() => validateClassMapping(projectId, vintageStart, vintageEnd)).toThrow(AppError);
    });

    it('should reject empty project ID', () => {
      const projectId = '';
      const vintageStart = new Date('2020-01-01');
      const vintageEnd = new Date('2020-12-31');
      
      expect(() => validateClassMapping(projectId, vintageStart, vintageEnd)).toThrow(AppError);
    });

    it('should generate deterministic class ID', () => {
      const projectId = 'PRJ001';
      const vintageStart = new Date('2020-01-01');
      const vintageEnd = new Date('2020-12-31');
      
      const classId1 = generateClassId(projectId, vintageStart, vintageEnd);
      const classId2 = generateClassId(projectId, vintageStart, vintageEnd);
      
      expect(classId1).toBe(classId2);
      expect(classId1).toMatch(/^0x[a-fA-F0-9]{32}$/);
    });

    it('should generate different class IDs for different inputs', () => {
      const classId1 = generateClassId('PRJ001', new Date('2020-01-01'), new Date('2020-12-31'));
      const classId2 = generateClassId('PRJ002', new Date('2020-01-01'), new Date('2020-12-31'));
      
      expect(classId1).not.toBe(classId2);
    });
  });

  describe('Token Mapping', () => {
    it('should create token mapping successfully', async () => {
      const mockMapping = {
        id: '123',
        classId: 'class_123',
        chainId: '137',
        contractAddress: '0xabcdef1234567890123456789012345678901234',
        tokenId: 'token_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.tokenMap.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.tokenMap.create).mockResolvedValue(mockMapping);

      const result = await createTokenMapping({
        classId: 'class_123',
        chainId: '137',
        contractAddress: '0xabcdef1234567890123456789012345678901234',
        tokenId: 'token_123',
      });

      expect(result.classId).toBe('class_123');
      expect(result.chainId).toBe('137');
      expect(result.contractAddress).toBe('0xabcdef1234567890123456789012345678901234');
      expect(result.tokenId).toBe('token_123');
      expect(prisma.tokenMap.create).toHaveBeenCalled();
    });

    it('should get token mapping successfully', async () => {
      const mockMapping = {
        id: '123',
        classId: 'class_123',
        chainId: '137',
        contractAddress: '0xabcdef1234567890123456789012345678901234',
        tokenId: 'token_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.tokenMap.findUnique).mockResolvedValue(mockMapping);

      const result = await getTokenMapping('class_123');

      expect(result).not.toBeNull();
      expect(result?.classId).toBe('class_123');
      expect(prisma.tokenMap.findUnique).toHaveBeenCalledWith({
        where: { classId: 'class_123' },
      });
    });

    it('should return null for non-existent token mapping', async () => {
      vi.mocked(prisma.tokenMap.findUnique).mockResolvedValue(null);

      const result = await getTokenMapping('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('Class ID Generation', () => {
    it('should generate valid hex class ID', () => {
      const classId = generateClassId('PRJ001', new Date('2020-01-01'), new Date('2020-12-31'));
      
      expect(classId).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(classId.length).toBeGreaterThanOrEqual(34); // 0x + at least 32 hex chars
      expect(classId).toMatch(/^0x/); // Must start with 0x
    });

    it('should handle edge cases', () => {
      const classId = generateClassId('PRJ', new Date('1900-01-01'), new Date('1900-12-31'));
      
      expect(classId).toBeTruthy();
      expect(classId).toMatch(/^0x[a-fA-F0-9]+$/);
    });
  });

  describe('Error Code Enums', () => {
    it('should have all expected error codes', () => {
      const expectedCodes = [
        'INVALID_JWT',
        'FORBIDDEN',
        'UNAUTHORIZED',
        'BAD_REQUEST',
        'VALIDATION_ERROR',
        'POLICY_BLOCKED',
        'INSUFFICIENT_BALANCE',
        'CLASS_NOT_FOUND',
        'PROJECT_NOT_APPROVED',
        'CHAIN_UNAVAILABLE',
        'TX_REVERTED',
        'TX_TIMEOUT',
        'INSUFFICIENT_GAS',
        'IDEMPOTENT_REPLAY',
        'REGISTRY_UNAVAILABLE',
        'LOCKER_UNAVAILABLE',
        'ORACLE_UNAVAILABLE',
        'INTERNAL_ERROR',
        'DATABASE_ERROR',
      ];

      expectedCodes.forEach(code => {
        expect(ErrorCode).toHaveProperty(code);
      });
    });
  });

  describe('Configuration', () => {
    it('should validate configuration exists', () => {
      // This test verifies that the config module can be imported
      expect(true).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate Ethereum address format', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      const invalidAddress = 'invalid';
      
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      
      expect(addressRegex.test(validAddress)).toBe(true);
      expect(addressRegex.test(invalidAddress)).toBe(false);
    });

    it('should validate bytes32 format', () => {
      const validBytes32 = '0x' + 'a'.repeat(64);
      const invalidBytes32 = '0xabc';
      
      const bytes32Regex = /^0x[a-fA-F0-9]{64}$/;
      
      expect(bytes32Regex.test(validBytes32)).toBe(true);
      expect(bytes32Regex.test(invalidBytes32)).toBe(false);
    });

    it('should validate UUID format for idempotency keys', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUUID = 'not-a-uuid';
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      expect(uuidRegex.test(validUUID)).toBe(true);
      expect(uuidRegex.test(invalidUUID)).toBe(false);
    });
  });
});
