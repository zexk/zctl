import { pgTable, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';

export const machines = pgTable('machines', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  lastHeartbeat: timestamp('last_heartbeat'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const commands = pgTable('commands', {
  id: uuid('id').primaryKey().defaultRandom(),
  machineId: uuid('machine_id')
    .references(() => machines.id)
    .notNull(),
  command: text('command').notNull(),
  exitCode: integer('exit_code'),
  stdout: text('stdout'),
  stderr: text('stderr'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});
