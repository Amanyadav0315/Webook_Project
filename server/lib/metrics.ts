import { redis } from './redis';
import { type Metrics } from '@shared/schema';

export class MetricsService {
  async incrementReceived(): Promise<void> {
    await redis.incrementCounter('received');
  }

  async incrementDeduped(): Promise<void> {
    await redis.incrementCounter('deduped');
  }

  async incrementSent(): Promise<void> {
    await redis.incrementCounter('sent');
  }

  async incrementFailed(): Promise<void> {
    await redis.incrementCounter('failed');
  }

  async incrementDlq(): Promise<void> {
    await redis.incrementCounter('dlq');
  }

  async getMetrics(): Promise<Metrics> {
    const [received, deduped, sent, failed, dlq, queueSize] = await Promise.all([
      redis.getCounter('received'),
      redis.getCounter('deduped'),
      redis.getCounter('sent'),
      redis.getCounter('failed'),
      redis.getCounter('dlq'),
      redis.getStreamLength('orders-stream'),
    ]);

    return {
      received,
      deduped,
      sent,
      failed,
      dlq,
      queueSize,
    };
  }

  async resetMetrics(): Promise<void> {
    const keys = ['received', 'deduped', 'sent', 'failed', 'dlq'];
    for (const key of keys) {
      await redis.getClient().del(`metrics:${key}`);
    }
  }
}

export const metricsService = new MetricsService();
