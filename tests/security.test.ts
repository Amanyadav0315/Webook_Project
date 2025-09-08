import { SecurityService } from '../server/lib/security';

describe('SecurityService', () => {
  describe('verifyHmacSignature', () => {
    const secret = 'test-secret-key';
    const message = 'test message';

    it('should verify valid HMAC signature', () => {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(message, 'utf8')
        .digest('hex');

      const isValid = SecurityService.verifyHmacSignature(
        expectedSignature,
        message,
        secret
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      const invalidSignature = 'invalid-signature';

      const isValid = SecurityService.verifyHmacSignature(
        invalidSignature,
        message,
        secret
      );

      expect(isValid).toBe(false);
    });

    it('should handle signatures with sha256= prefix', () => {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(message, 'utf8')
        .digest('hex');

      const isValid = SecurityService.verifyHmacSignature(
        `sha256=${expectedSignature}`,
        message,
        secret
      );

      expect(isValid).toBe(true);
    });

    it('should handle empty or malformed signatures gracefully', () => {
      expect(SecurityService.verifyHmacSignature('', message, secret)).toBe(false);
      expect(SecurityService.verifyHmacSignature('malformed', message, secret)).toBe(false);
    });
  });

  describe('isTimestampValid', () => {
    it('should accept recent timestamps', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000).toString();
      expect(SecurityService.isTimestampValid(recentTimestamp)).toBe(true);
    });

    it('should reject old timestamps', () => {
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 400 seconds ago
      expect(SecurityService.isTimestampValid(oldTimestamp, 300)).toBe(false);
    });

    it('should accept timestamps within custom window', () => {
      const timestamp = (Math.floor(Date.now() / 1000) - 100).toString(); // 100 seconds ago
      expect(SecurityService.isTimestampValid(timestamp, 120)).toBe(true);
    });

    it('should handle invalid timestamp formats', () => {
      expect(SecurityService.isTimestampValid('invalid')).toBe(false);
      expect(SecurityService.isTimestampValid('')).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should return correct delays for retry attempts', () => {
      expect(SecurityService.calculateRetryDelay(0)).toBe(1000); // 1s
      expect(SecurityService.calculateRetryDelay(1)).toBe(4000); // 4s  
      expect(SecurityService.calculateRetryDelay(2)).toBe(10000); // 10s
      expect(SecurityService.calculateRetryDelay(3)).toBe(10000); // Cap at 10s
      expect(SecurityService.calculateRetryDelay(10)).toBe(10000); // Cap at 10s
    });
  });

  describe('shouldMoveToDeadLetter', () => {
    it('should move to DLQ after 3 retries', () => {
      expect(SecurityService.shouldMoveToDeadLetter(0)).toBe(false);
      expect(SecurityService.shouldMoveToDeadLetter(1)).toBe(false);
      expect(SecurityService.shouldMoveToDeadLetter(2)).toBe(false);
      expect(SecurityService.shouldMoveToDeadLetter(3)).toBe(true);
      expect(SecurityService.shouldMoveToDeadLetter(5)).toBe(true);
    });
  });
});
