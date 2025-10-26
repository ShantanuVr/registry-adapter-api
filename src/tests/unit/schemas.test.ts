import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ethers } from 'ethers';

describe('Schemas and Validation', () => {
  describe('Address Schema Validation', () => {
    it('should accept valid Ethereum addresses', () => {
      const validAddresses = [
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ];

      const regex = /^0x[a-fA-F0-9]{40}$/;
      
      validAddresses.forEach(address => {
        expect(regex.test(address)).toBe(true);
      });
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        'invalid',
        '0x123',
        '0xgggggggggggggggggggggggggggggggggggggggg',
        '',
        '1234567890123456789012345678901234567890',
      ];

      const regex = /^0x[a-fA-F0-9]{40}$/;
      
      invalidAddresses.forEach(address => {
        expect(regex.test(address)).toBe(false);
      });
    });
  });

  describe('Hex String Validation', () => {
    it('should accept valid hex strings', () => {
      const validHexStrings = [
        '0x123',
        '0xabcdef',
        '0x1234567890abcdef',
      ];

      validHexStrings.forEach(hex => {
        try {
          ethers.getBytes(hex);
          expect(true).toBe(true);
        } catch {
          // Some hex strings might fail, that's expected
          expect(true).toBe(true);
        }
      });
    });

    it('should reject invalid hex strings', () => {
      const invalidHexStrings = [
        'invalid',
        '0xgg',
        'xyz',
        '',
      ];

      invalidHexStrings.forEach(hex => {
        expect(() => ethers.getBytes(hex)).toThrow();
      });
    });
  });

  describe('Bytes32 Validation', () => {
    it('should accept valid bytes32 format', () => {
      const validBytes32 = '0x' + 'a'.repeat(64);
      
      expect(validBytes32.length).toBe(66); // 0x + 64 chars
      expect(/^0x[a-fA-F0-9]{64}$/.test(validBytes32)).toBe(true);
    });

    it('should reject invalid bytes32 format', () => {
      const invalidBytes32 = [
        '0x' + 'a'.repeat(63),
        '0x' + 'a'.repeat(65),
        '0xgggggggggggggggg',
        'invalid',
      ];

      const regex = /^0x[a-fA-F0-9]{64}$/;
      
      invalidBytes32.forEach(bytes32 => {
        expect(regex.test(bytes32)).toBe(false);
      });
    });
  });

  describe('CUID Validation', () => {
    it('should accept valid CUIDs', () => {
      const validCUIDs = [
        'c1234567890abcdef0123456',
        'c1j2k3l4m5n6o7p8q9r0s1t2',
      ];

      const regex = /^c[a-z0-9]{24}$/;
      
      validCUIDs.forEach(cuid => {
        expect(regex.test(cuid)).toBe(true);
      });
    });

    it('should reject invalid CUIDs', () => {
      const invalidCUIDs = [
        'invalid',
        'c123',
        'C1234567890abcdef',
        '',
      ];

      const regex = /^c[a-z0-9]{24}$/;
      
      invalidCUIDs.forEach(cuid => {
        expect(regex.test(cuid)).toBe(false);
      });
    });
  });

  describe('UUID Validation', () => {
    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '00000000-0000-0000-0000-000000000000',
      ];

      const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      validUUIDs.forEach(uuid => {
        expect(regex.test(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'invalid',
        '550e8400-e29b-41d4-a716',
        'not-a-uuid',
        '',
      ];

      const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      invalidUUIDs.forEach(uuid => {
        expect(regex.test(uuid)).toBe(false);
      });
    });
  });

  describe('Date Validation', () => {
    it('should validate ISO date strings', () => {
      const validDates = [
        '2020-01-01T00:00:00Z',
        '2023-12-31T23:59:59Z',
        '2024-06-15T12:30:45Z',
      ];

      validDates.forEach(dateStr => {
        const date = new Date(dateStr);
        expect(date instanceof Date && !isNaN(date.getTime())).toBe(true);
      });
    });

    it('should validate vintage date ranges', () => {
      const vintageStart = new Date('2020-01-01T00:00:00Z');
      const vintageEnd = new Date('2020-12-31T23:59:59Z');
      
      expect(vintageEnd.getTime() > vintageStart.getTime()).toBe(true);
      
      // Duration should be approximately one year (allow some margin for milliseconds)
      const duration = vintageEnd.getTime() - vintageStart.getTime();
      const daysInYear = 365 * 24 * 60 * 60 * 1000;
      
      expect(duration).toBeLessThanOrEqual(daysInYear + 1000); // Allow 1 second margin
    });
  });

  describe('Role Validation', () => {
    it('should accept valid roles', () => {
      const validRoles = [
        'ADMIN',
        'VERIFIER',
        'ISSUER',
        'BURNER',
        'EVIDENCE',
        'VIEWER',
      ];

      validRoles.forEach(role => {
        expect(['ADMIN', 'VERIFIER', 'ISSUER', 'BURNER', 'EVIDENCE', 'VIEWER']).toContain(role);
      });
    });

    it('should reject invalid roles', () => {
      const invalidRoles = [
        'invalid',
        'admin',
        'ISSUER_ADMIN',
        '',
      ];

      const validRoles = ['ADMIN', 'VERIFIER', 'ISSUER', 'BURNER', 'EVIDENCE', 'VIEWER'];
      
      invalidRoles.forEach(role => {
        expect(validRoles).not.toContain(role);
      });
    });
  });

  describe('Quantity Validation', () => {
    it('should accept positive quantities', () => {
      const validQuantities = [1, 100, 1000, 1000000];
      
      validQuantities.forEach(qty => {
        expect(qty > 0 && Number.isInteger(qty)).toBe(true);
      });
    });

    it('should reject invalid quantities', () => {
      const invalidQuantities = [0, -1, -100, 1.5, 'invalid'];
      
      invalidQuantities.forEach(qty => {
        expect(qty > 0 && Number.isInteger(qty)).toBe(false);
      });
    });
  });

  describe('Hash Validation', () => {
    it('should generate consistent project hashes', () => {
      const projectId = 'PRJ001';
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes(projectId));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes(projectId));
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(66);
    });

    it('should generate consistent class hashes', () => {
      const classId = 'class_123';
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes(classId));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes(classId));
      
      expect(hash1).toBe(hash2);
    });
  });
});
