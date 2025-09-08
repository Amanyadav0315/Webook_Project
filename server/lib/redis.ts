import { Redis } from 'ioredis';

class RedisClient {
  private client: Redis;
  
  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Idempotency operations
  async setIdempotencyKey(eventId: string, ttl = 86400): Promise<boolean> {
    const key = `idempotency:${eventId}`;
    const result = await this.client.setex(key, ttl, '1');
    return result === 'OK';
  }

  async checkIdempotencyKey(eventId: string): Promise<boolean> {
    const key = `idempotency:${eventId}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  // Rate limiting
  async checkRateLimit(ip: string, limit = 10, window = 10): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate_limit:${ip}`;
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, window);
    }

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current)
    };
  }

  // Redis Streams for job queue
  async addToStream(streamName: string, data: Record<string, any>): Promise<string> {
    const fields = Object.entries(data).flat();
    return await this.client.xadd(streamName, '*', ...fields);
  }

  async createConsumerGroup(streamName: string, groupName: string, startId = '$'): Promise<boolean> {
    try {
      await this.client.xgroup('CREATE', streamName, groupName, startId, 'MKSTREAM');
      return true;
    } catch (error: any) {
      if (error.message.includes('BUSYGROUP')) {
        // Group already exists
        return true;
      }
      throw error;
    }
  }

  async readFromStream(
    streamName: string, 
    groupName: string, 
    consumerName: string, 
    count = 1
  ): Promise<any[]> {
    const result = await this.client.xreadgroup(
      'GROUP', groupName, consumerName,
      'COUNT', count,
      'BLOCK', 1000,
      'STREAMS', streamName, '>'
    );

    if (!result || result.length === 0) return [];
    
    return result[0][1].map((msg: any) => ({
      id: msg[0],
      fields: this.parseStreamMessage(msg[1])
    }));
  }

  async acknowledgeMessage(streamName: string, groupName: string, messageId: string): Promise<void> {
    await this.client.xack(streamName, groupName, messageId);
  }

  async moveToDeadLetter(streamName: string, data: Record<string, any>): Promise<string> {
    return await this.addToStream(`${streamName}-dlq`, data);
  }

  // FCM token management
  async setFcmToken(userId: string, token: string): Promise<void> {
    await this.client.set(`fcm:token:${userId}`, token);
  }

  async getFcmToken(userId: string): Promise<string | null> {
    return await this.client.get(`fcm:token:${userId}`);
  }

  // Metrics storage
  async incrementCounter(key: string): Promise<number> {
    return await this.client.incr(`metrics:${key}`);
  }

  async getCounter(key: string): Promise<number> {
    const value = await this.client.get(`metrics:${key}`);
    return value ? parseInt(value, 10) : 0;
  }

  async getStreamLength(streamName: string): Promise<number> {
    return await this.client.xlen(streamName);
  }

  private parseStreamMessage(fields: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const value = fields[i + 1];
      
      // Try to parse JSON values
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    }
    return result;
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}

export const redis = new RedisClient();
