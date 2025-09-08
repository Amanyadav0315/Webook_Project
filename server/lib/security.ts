import crypto from 'crypto';

export class SecurityService {
  static verifyHmacSignature(
    signature: string,
    body: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex');

      // Remove any prefix like "sha256=" if present
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('HMAC verification error:', error);
      return false;
    }
  }

  static isTimestampValid(timestamp: string, windowSeconds = 300): boolean {
    try {
      const requestTime = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(currentTime - requestTime);
      
      return timeDiff <= windowSeconds;
    } catch (error) {
      console.error('Timestamp validation error:', error);
      return false;
    }
  }

  static calculateRetryDelay(retryCount: number): number {
    const delays = [1000, 4000, 10000]; // 1s, 4s, 10s
    return delays[Math.min(retryCount, delays.length - 1)];
  }

  static shouldMoveToDeadLetter(retryCount: number): boolean {
    return retryCount >= 3;
  }
}
