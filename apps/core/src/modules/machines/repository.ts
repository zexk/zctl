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

export async function findByHostname(hostname: string): Promise<Machine | undefined> {
  const rows = await db.select().from(machines).where(eq(machines.hostname, hostname)).limit(1);
  return rows[0];
}

export async function create(data: NewMachine): Promise<Machine> {
  const rows = await db.insert(machines).values(data).returning();
  return rows[0];
}

export async function updateLastSeen(id: string): Promise<Machine> {
  const rows = await db
    .update(machines)
    .set({ lastSeen: new Date() })
    .where(eq(machines.id, id))
    .returning();
  return rows[0];
}
