import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppError, ErrorCode } from '../src/lib/errors.js';
import { validateClassMapping } from '../src/modules/classes/index.js';
import { generateClassId } from '../src/modules/classes/index.js';

describe('Registry Adapter API', () => {
  describe('Error Handling', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError(ErrorCode.BAD_REQUEST, 'Test error', 400, 'trace123');
      
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.traceId).toBe('trace123');
      expect(error).toBeInstanceOf(Error);
    });

    it('should check if error is AppError', () => {
      const appError = new AppError(ErrorCode.BAD_REQUEST, 'Test error');
      const regularError = new Error('Regular error');
      
      expect(AppError.isAppError(appError)).toBe(true);
      expect(AppError.isAppError(regularError)).toBe(false);
    });
  });

  describe('Class Mapping', () => {
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
  });

  describe('Configuration', () => {
    it('should have required environment variables', () => {
      // This test would check if all required env vars are present
      // In a real test, you'd mock the environment
      expect(process.env.NODE_ENV).toBeDefined();
    });
  });
});
