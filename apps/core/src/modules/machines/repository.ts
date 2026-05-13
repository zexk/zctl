import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { machines } from '../../db/schema/machines.js';
import type { Machine, NewMachine } from '../../db/schema/machines.js';

export async function findAll(): Promise<Machine[]> {
  return db.select().from(machines);
}

export async function findById(id: string): Promise<Machine | undefined> {
  const rows = await db.select().from(machines).where(eq(machines.id, id)).limit(1);
  return rows[0];
}

export async function create(data: NewMachine): Promise<Machine> {
  const rows = await db.insert(machines).values(data).returning();
  return rows[0];
}
