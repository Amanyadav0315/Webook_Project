import { redis } from './redis';
import { type Metrics } from '@shared/schema';

// Fallback in-memory metrics store
class InMemoryMetrics {
  private metrics: Record<string, number> = {
    received: 0,
    deduped: 0,
    sent: 0,
    failed: 0,
    dlq: 0,
    queueSize: 0,
  };

  increment(key: string): void {
    this.metrics[key] = (this.metrics[key] || 0) + 1;
  }

  get(key: string): number {
    return this.metrics[key] || 0;
  }

  reset(): void {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0;
    });
  }
}

const fallbackMetrics = new InMemoryMetrics();

export class MetricsService {
  async incrementReceived(): Promise<void> {
    try {
      await redis.incrementCounter('received');
    } catch (error) {
      fallbackMetrics.increment('received');
    }
  }

  async incrementDeduped(): Promise<void> {
    try {
      await redis.incrementCounter('deduped');
    } catch (error) {
      fallbackMetrics.increment('deduped');
    }
  }

  async incrementSent(): Promise<void> {
    try {
      await redis.incrementCounter('sent');
    } catch (error) {
      fallbackMetrics.increment('sent');
    }
  }

  async incrementFailed(): Promise<void> {
    try {
      await redis.incrementCounter('failed');
    } catch (error) {
      fallbackMetrics.increment('failed');
    }
  }

  async incrementDlq(): Promise<void> {
    try {
      await redis.incrementCounter('dlq');
    } catch (error) {
      fallbackMetrics.increment('dlq');
    }
  }

  async getMetrics(): Promise<Metrics> {
    try {
      const [received, deduped, sent, failed, dlq, queueSize] = await Promise.allSettled([
        redis.getCounter('received'),
        redis.getCounter('deduped'),
        redis.getCounter('sent'),
        redis.getCounter('failed'),
        redis.getCounter('dlq'),
        redis.getStreamLength('orders-stream'),
      ]);

      return {
        received: received.status === 'fulfilled' ? received.value : fallbackMetrics.get('received'),
        deduped: deduped.status === 'fulfilled' ? deduped.value : fallbackMetrics.get('deduped'),
        sent: sent.status === 'fulfilled' ? sent.value : fallbackMetrics.get('sent'),
        failed: failed.status === 'fulfilled' ? failed.value : fallbackMetrics.get('failed'),
        dlq: dlq.status === 'fulfilled' ? dlq.value : fallbackMetrics.get('dlq'),
        queueSize: queueSize.status === 'fulfilled' ? queueSize.value : 0,
      };
    } catch (error) {
      // Return fallback metrics
      console.log('Redis metrics completely unavailable, using fallback');
      return {
        received: fallbackMetrics.get('received'),
        deduped: fallbackMetrics.get('deduped'),
        sent: fallbackMetrics.get('sent'),
        failed: fallbackMetrics.get('failed'),
        dlq: fallbackMetrics.get('dlq'),
        queueSize: 0,
      };
    }
  }

  async resetMetrics(): Promise<void> {
    try {
      const keys = ['received', 'deduped', 'sent', 'failed', 'dlq'];
      for (const key of keys) {
        await redis['client'].del(`metrics:${key}`);
      }
    } catch (error) {
      fallbackMetrics.reset();
    }
  }
}

export const metricsService = new MetricsService();
