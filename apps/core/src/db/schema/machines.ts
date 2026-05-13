import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const machines = pgTable('machines', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostname: text('hostname').notNull().unique(),
  os: text('os'),
  arch: text('arch'),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Machine = typeof machines.$inferSelect;
export type NewMachine = typeof machines.$inferInsert;
