import { redis } from './lib/redis';
import { firebaseService } from './lib/firebase';
import { storage } from './storage';
import { metricsService } from './lib/metrics';
import { SecurityService } from './lib/security';
import { EventStatus, webhookPayloadSchema } from '@shared/schema';

class EventWorker {
  private running = false;
  private readonly streamName = 'orders-stream';
  private readonly groupName = 'workers';
  private readonly consumerName = 'worker-1';

  async start(): Promise<void> {
    console.log('Starting event worker...');
    
    // Initialize Redis streams and consumer group
    await redis.createConsumerGroup(this.streamName, this.groupName);
    
    this.running = true;
    
    while (this.running) {
      try {
        await this.processMessages();
      } catch (error) {
        console.error('Worker loop error:', error);
        await this.delay(5000); // Wait 5s before retrying
      }
    }
  }

  async stop(): Promise<void> {
    console.log('Stopping event worker...');
    this.running = false;
  }

  private async processMessages(): Promise<void> {
    const messages = await redis.readFromStream(
      this.streamName,
      this.groupName,
      this.consumerName,
      1
    );

    for (const message of messages) {
      await this.processMessage(message);
    }
  }

  private async processMessage(message: any): Promise<void> {
    const { id: messageId, fields } = message;
    
    try {
      console.log(`Processing message ${messageId}:`, fields);
      
      const eventId = fields.event_id;
      const retryCount = parseInt(fields.retry_count || '0', 10);
      
      // Find event in storage
      const event = await storage.getEventByEventId(eventId);
      if (!event) {
        console.error(`Event not found: ${eventId}`);
        await redis.acknowledgeMessage(this.streamName, this.groupName, messageId);
        return;
      }

      // Update event status to processing
      await storage.updateEvent(event.id, {
        status: EventStatus.PROCESSING,
      });

      // Parse payload
      const payload = webhookPayloadSchema.parse(JSON.parse(fields.payload));
      
      // Get FCM token for user (with fallback)
      let deviceToken: string | null = null;
      try {
        deviceToken = await redis.getFcmToken(payload.data.userId);
      } catch (error) {
        console.log('FCM token lookup failed, using topic instead');
      }
      
      // Send FCM notification
      const result = await firebaseService.sendNotification(
        payload.data.userId,
        payload.data.order_id,
        deviceToken || undefined
      );

      if (result.success) {
        // Mark as sent
        await storage.updateEvent(event.id, {
          status: EventStatus.SENT,
          processedAt: new Date(),
        });
        
        await metricsService.incrementSent();
        console.log(`Event ${eventId} processed successfully`);
      } else {
        // Handle failure
        await this.handleFailure(event, retryCount, result.error || 'Unknown error', messageId);
      }

      // Acknowledge message
      try {
        await redis.acknowledgeMessage(this.streamName, this.groupName, messageId);
      } catch (error) {
        console.log('Failed to acknowledge message, Redis unavailable');
      }

    } catch (error: any) {
      console.error(`Error processing message ${messageId}:`, error);
      
      // Handle processing error
      const eventId = fields?.event_id;
      if (eventId) {
        const event = await storage.getEventByEventId(eventId);
        if (event) {
          const retryCount = parseInt(fields.retry_count || '0', 10);
          await this.handleFailure(event, retryCount, error.message, messageId);
        }
      }
      
      // Still acknowledge to avoid infinite retries
      try {
        await redis.acknowledgeMessage(this.streamName, this.groupName, messageId);
      } catch (error) {
        console.log('Failed to acknowledge error message, Redis unavailable');
      }
    }
  }

  private async handleFailure(
    event: any,
    retryCount: number,
    errorMessage: string,
    messageId: string
  ): Promise<void> {
    const newRetryCount = retryCount + 1;
    
    if (SecurityService.shouldMoveToDeadLetter(newRetryCount)) {
      // Move to dead letter queue
      try {
        await redis.moveToDeadLetter(this.streamName, {
          event_id: event.eventId,
          payload: JSON.stringify(event.payload),
          error: errorMessage,
          failed_at: Date.now(),
          retry_count: newRetryCount,
        });
      } catch (error) {
        console.log('Failed to move to dead letter queue, Redis unavailable');
      }

      // Update event as failed
      await storage.updateEvent(event.id, {
        status: EventStatus.FAILED,
        retryCount: newRetryCount,
        errorMessage,
        failedAt: new Date(),
      });

      await metricsService.incrementFailed();
      await metricsService.incrementDlq();
      
      console.log(`Event ${event.eventId} moved to dead letter queue after ${newRetryCount} failures`);
    } else {
      // Schedule retry with exponential backoff
      const delay = SecurityService.calculateRetryDelay(retryCount);
      
      console.log(`Retrying event ${event.eventId} in ${delay}ms (attempt ${newRetryCount})`);
      
      setTimeout(async () => {
        try {
          await redis.addToStream(this.streamName, {
            event_id: event.eventId,
            payload: JSON.stringify(event.payload),
            timestamp: Date.now(),
            retry_count: newRetryCount,
          });
        } catch (error) {
          console.log('Failed to re-queue event for retry, Redis unavailable');
        }
      }, delay);

      // Update retry count
      await storage.updateEvent(event.id, {
        retryCount: newRetryCount,
        errorMessage,
        status: EventStatus.QUEUED,
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize and start worker if running directly
if (require.main === module) {
  const worker = new EventWorker();
  
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await worker.stop();
    await redis.disconnect();
    process.exit(0);
  });

  worker.start().catch((error) => {
    console.error('Worker failed to start:', error);
    process.exit(1);
  });
}

export { EventWorker };
