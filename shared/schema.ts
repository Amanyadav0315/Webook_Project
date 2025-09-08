import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().unique(),
  type: text("type").notNull(),
  userId: text("user_id"),
  orderId: text("order_id"),
  amount: integer("amount"),
  status: text("status").notNull().default("queued"), // queued | processing | sent | failed
  retryCount: integer("retry_count").notNull().default(0),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Webhook payload schema
export const webhookPayloadSchema = z.object({
  event_id: z.string(),
  type: z.string(),
  data: z.object({
    order_id: z.string(),
    userId: z.string(),
    amount: z.number(),
  }),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// Metrics schema
export const metricsSchema = z.object({
  received: z.number(),
  deduped: z.number(),
  sent: z.number(),
  failed: z.number(),
  dlq: z.number(),
  queueSize: z.number(),
});

export type Metrics = z.infer<typeof metricsSchema>;

// Event status enum
export const EventStatus = {
  QUEUED: 'queued' as const,
  PROCESSING: 'processing' as const,
  SENT: 'sent' as const,
  FAILED: 'failed' as const,
};

export type EventStatusType = typeof EventStatus[keyof typeof EventStatus];
