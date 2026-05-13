import { pgTable, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import { machines } from './machines.js';

export const commandExecutions = pgTable('command_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  machineId: uuid('machine_id')
    .notNull()
    .references(() => machines.id),
  command: text('command').notNull(),
  stdout: text('stdout'),
  stderr: text('stderr'),
  exitCode: integer('exit_code'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export type CommandExecution = typeof commandExecutions.$inferSelect;
export type NewCommandExecution = typeof commandExecutions.$inferInsert;
