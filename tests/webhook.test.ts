import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { registerRoutes } from '../server/routes';

describe('Webhook Endpoint', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
    process.env.WEBHOOK_SECRET = 'test-secret-key';
  });

  const createSignature = (body: string, secret: string): string => {
    return crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
  };

  const validPayload = {
    event_id: 'evt_test123',
    type: 'order.created',
    data: {
      order_id: 'ord_456',
      userId: 'user_789',
      amount: 2999,
    },
  };

  describe('POST /api/webhook/order.created', () => {
    it('should accept valid webhook with correct signature', async () => {
      const body = JSON.stringify(validPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(body, 'test-secret-key');

      const response = await request(app)
        .post('/api/webhook/order.created')
        .set('Content-Type', 'application/json')
        .set('X-Signature', signature)
        .set('X-Timestamp', timestamp)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.event_id).toBe(validPayload.event_id);
    });

    it('should reject webhook with invalid signature', async () => {
      const body = JSON.stringify(validPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const invalidSignature = 'invalid-signature';

      const response = await request(app)
        .post('/api/webhook/order.created')
        .set('Content-Type', 'application/json')
        .set('X-Signature', invalidSignature)
        .set('X-Timestamp', timestamp)
        .send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should reject webhook with old timestamp', async () => {
      const body = JSON.stringify(validPayload);
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 400 seconds ago
      const signature = createSignature(body, 'test-secret-key');

      const response = await request(app)
        .post('/api/webhook/order.created')
        .set('Content-Type', 'application/json')
        .set('X-Signature', signature)
        .set('X-Timestamp', oldTimestamp)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Request too old');
    });

    it('should reject webhook without required headers', async () => {
      const body = JSON.stringify(validPayload);

      const response = await request(app)
        .post('/api/webhook/order.created')
        .set('Content-Type', 'application/json')
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required headers');
    });

    it('should handle duplicate event_id (idempotency)', async () => {
      const body = JSON.stringify(validPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(body, 'test-secret-key');

      // First request
      await request(app)
        .post('/api/webhook/order.created')
        .set('Content-Type', 'application/json')
        .set('X-Signature', signature)
        .set('X-Timestamp', timestamp)
        .send(body);

      // Duplicate request
      const response = await request(app)
        .post('/api/webhook/order.created')
        .set('Content-Type', 'application/json')
        .set('X-Signature', signature)
        .set('X-Timestamp', timestamp)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Duplicate event ignored');
    });

    it('should reject malformed JSON payload', async () => {
      const invalidJson = '{"invalid": json}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(invalidJson, 'test-secret-key');

      const response = await request(app)
        .post('/api/webhook/order.created')
        .set('Content-Type', 'application/json')
        .set('X-Signature', signature)
        .set('X-Timestamp', timestamp)
        .send(invalidJson);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid payload format');
    });
  });

  describe('GET /api/health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok');
      expect(response.body).toHaveProperty('redis');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/metrics', () => {
    it('should return event processing metrics', async () => {
      const response = await request(app)
        .get('/api/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received');
      expect(response.body).toHaveProperty('sent');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('queueSize');
    });
  });
});
