import { type Event, type InsertEvent } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEventById(id: string): Promise<Event | undefined>;
  getEventByEventId(eventId: string): Promise<Event | undefined>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  getEvents(limit?: number, offset?: number, status?: string): Promise<Event[]>;
  getEventsByStatus(status: string): Promise<Event[]>;
  
  // Search operations
  searchEventsByEventId(eventId: string): Promise<Event[]>;
}

export class MemStorage implements IStorage {
  private events: Map<string, Event>;

  constructor() {
    this.events = new Map();
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const now = new Date();
    const event: Event = { 
      ...insertEvent, 
      id,
      createdAt: now,
      updatedAt: now,
      processedAt: null,
      failedAt: null,
      errorMessage: null,
    };
    this.events.set(id, event);
    return event;
  }

  async getEventById(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventByEventId(eventId: string): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(
      (event) => event.eventId === eventId
    );
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) return undefined;

    const updatedEvent: Event = {
      ...existingEvent,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async getEvents(limit = 20, offset = 0, status?: string): Promise<Event[]> {
    const allEvents = Array.from(this.events.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const filteredEvents = status 
      ? allEvents.filter(event => event.status === status)
      : allEvents;

    return filteredEvents.slice(offset, offset + limit);
  }

  async getEventsByStatus(status: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.status === status
    );
  }

  async searchEventsByEventId(eventId: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.eventId.toLowerCase().includes(eventId.toLowerCase())
    );
  }
}

export const storage = new MemStorage();
