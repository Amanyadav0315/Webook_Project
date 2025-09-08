# Event Pipeline - Webhook to Push Notification System

## Overview

A production-ready event processing pipeline that accepts third-party webhooks, queues jobs in Redis, and sends Firebase Cloud Messaging (FCM) notifications with an admin dashboard. The system is built as a full-stack application with Express.js backend handling webhook ingestion and job processing, React frontend for administration, and Redis for reliable message queuing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript** - Client-side application built using Vite
- **ShadCN UI Components** - Modern component library with Tailwind CSS styling
- **Tanstack Query** - For server state management and API interactions
- **Wouter** - Lightweight client-side routing
- **Admin Dashboard** - Single-page application for event monitoring and management

### Backend Architecture
- **Express.js Server** - RESTful API with TypeScript support
- **Modular Design** - Separated concerns with dedicated services for security, metrics, Firebase, and Redis operations
- **Webhook Processing** - Raw body parsing for HMAC signature verification
- **Worker Process** - Background job processing with Redis Streams
- **In-Memory Storage** - Development storage layer with interface for easy database migration

### Queue Management
- **Redis Streams** - Primary queuing mechanism with consumer groups
- **Exponential Backoff** - Retry logic with increasing delays (1s → 4s → 10s)
- **Dead Letter Queue** - Failed jobs moved after 3 retry attempts
- **Rate Limiting** - IP-based throttling (10 requests per 10 seconds)

### Security Implementation
- **HMAC Signature Verification** - Raw body validation using crypto.timingSafeEqual
- **Timestamp Validation** - 5-minute request window to prevent replay attacks
- **Idempotency Protection** - 24-hour duplicate prevention using event IDs
- **Input Validation** - Zod schema validation for all webhook payloads

### Event Processing Flow
- **Webhook Reception** - POST endpoint validates signatures and timestamps
- **Queue Enqueuing** - Events added to Redis streams with fast response (<300ms)
- **Background Processing** - Worker consumes events and sends FCM notifications
- **Status Tracking** - Event lifecycle monitoring (queued → processing → sent/failed)

### Monitoring and Observability
- **Structured Logging** - Request/response logging with performance metrics
- **Health Checks** - Redis connectivity and system status endpoints
- **Metrics Collection** - Counters for received, processed, failed, and dead letter events
- **Admin Interface** - Event search, filtering, and replay functionality

### Database Design
- **PostgreSQL Schema** - Events table with comprehensive tracking fields
- **Drizzle ORM** - Type-safe database operations with migrations
- **Event States** - Status progression tracking with timestamps
- **Payload Storage** - JSON storage for flexible webhook data

## External Dependencies

### Core Infrastructure
- **Redis** - Message queuing, rate limiting, and caching
- **PostgreSQL** - Primary data persistence via Neon serverless
- **Firebase Admin SDK** - Push notification delivery

### Development Tools
- **Vite** - Frontend build tool and development server
- **ESBuild** - Backend bundling for production
- **Drizzle Kit** - Database schema management and migrations

### UI Libraries
- **Radix UI** - Headless component primitives
- **Tailwind CSS** - Utility-first styling framework
- **Lucide Icons** - Icon library for UI elements

### Monitoring Integration
- **Replit Runtime** - Development environment error overlay
- **Jest** - Testing framework for security and webhook validation

### Authentication Services
- Ready for integration with external auth providers
- Session management prepared with connect-pg-simple

### Third-Party Webhooks
- Configurable webhook secret validation
- Support for standard webhook patterns with event_id, type, and data structure
- Extensible payload schema for different event types