import type { Express } from "express";
import { createServer, type Server } from "http";
import { Request, Response } from "express";
import { storage } from "./storage";
import { redis } from "./lib/redis";
import { SecurityService } from "./lib/security";
import { metricsService } from "./lib/metrics";
import { webhookPayloadSchema, EventStatus } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to get raw body for webhook endpoints
  app.use('/api/webhook', async (req: Request, res: Response, next) => {
    req.body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    next();
  });

  // Webhook endpoint: POST /api/webhook/order.created
  app.post('/api/webhook/order.created', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const rawBody = req.body as string;
      const signature = req.headers['x-signature'] as string;
      const timestamp = req.headers['x-timestamp'] as string;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Validate required headers
      if (!signature || !timestamp) {
        return res.status(400).json({ error: 'Missing required headers' });
      }

      // Check rate limit
      const rateLimit = await redis.checkRateLimit(clientIP);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          retryAfter: 10 
        });
      }

      // Validate timestamp
      if (!SecurityService.isTimestampValid(timestamp)) {
        return res.status(400).json({ error: 'Request too old' });
      }

      // Verify HMAC signature
      const webhookSecret = process.env.WEBHOOK_SECRET;
      if (!webhookSecret) {
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      if (!SecurityService.verifyHmacSignature(signature, rawBody, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Parse and validate payload
      let payload;
      try {
        payload = webhookPayloadSchema.parse(JSON.parse(rawBody));
      } catch (error) {
        return res.status(400).json({ error: 'Invalid payload format' });
      }

      // Check for duplicate event (idempotency)
      if (await redis.checkIdempotencyKey(payload.event_id)) {
        await metricsService.incrementDeduped();
        return res.status(200).json({ message: 'Duplicate event ignored' });
      }

      // Set idempotency key
      await redis.setIdempotencyKey(payload.event_id);

      // Create event in storage
      const event = await storage.createEvent({
        eventId: payload.event_id,
        type: payload.type,
        userId: payload.data.userId,
        orderId: payload.data.order_id,
        amount: payload.data.amount,
        status: EventStatus.QUEUED,
        retryCount: 0,
        payload: payload,
      });

      // Add to Redis stream for processing
      await redis.addToStream('orders-stream', {
        event_id: payload.event_id,
        payload: JSON.stringify(payload),
        timestamp: Date.now(),
        retry_count: 0,
      });

      // Update metrics
      await metricsService.incrementReceived();

      const processingTime = Date.now() - startTime;
      console.log(`Webhook processed in ${processingTime}ms`);

      // Ensure response is within 300ms requirement
      if (processingTime > 300) {
        console.warn(`Warning: Response time ${processingTime}ms exceeds 300ms limit`);
      }

      return res.status(200).json({ 
        message: 'Event queued successfully',
        event_id: payload.event_id 
      });

    } catch (error: any) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Health endpoint
  app.get('/api/health', async (req: Request, res: Response) => {
    try {
      const redisHealthy = await redis.isHealthy();
      
      return res.status(200).json({
        ok: redisHealthy,
        redis: redisHealthy ? 'up' : 'down',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        redis: 'down',
        error: 'Health check failed'
      });
    }
  });

  // Metrics endpoint
  app.get('/api/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await metricsService.getMetrics();
      return res.status(200).json(metrics);
    } catch (error) {
      console.error('Metrics error:', error);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Events API endpoints
  app.get('/api/events', async (req: Request, res: Response) => {
    try {
      const { limit = '20', offset = '0', status, search } = req.query;
      
      let events;
      if (search) {
        events = await storage.searchEventsByEventId(search as string);
      } else {
        events = await storage.getEvents(
          parseInt(limit as string),
          parseInt(offset as string),
          status as string
        );
      }
      
      return res.status(200).json(events);
    } catch (error) {
      console.error('Events fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.get('/api/events/:id', async (req: Request, res: Response) => {
    try {
      const event = await storage.getEventById(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      return res.status(200).json(event);
    } catch (error) {
      console.error('Event fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch event' });
    }
  });

  // Replay endpoint
  app.post('/api/events/:id/replay', async (req: Request, res: Response) => {
    try {
      const event = await storage.getEventById(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.status !== EventStatus.FAILED) {
        return res.status(400).json({ error: 'Only failed events can be replayed' });
      }

      // Reset event status and retry count
      await storage.updateEvent(event.id, {
        status: EventStatus.QUEUED,
        retryCount: 0,
        errorMessage: null,
        failedAt: null,
      });

      // Re-add to stream
      await redis.addToStream('orders-stream', {
        event_id: event.eventId,
        payload: JSON.stringify(event.payload),
        timestamp: Date.now(),
        retry_count: 0,
      });

      return res.status(200).json({ message: 'Event replayed successfully' });
    } catch (error) {
      console.error('Event replay error:', error);
      return res.status(500).json({ error: 'Failed to replay event' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
