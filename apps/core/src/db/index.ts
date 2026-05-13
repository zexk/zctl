import { sql } from 'drizzle-orm';
import { db } from './client.js';

export async function verifyConnection(): Promise<void> {
  await db.execute(sql`select 1`);
}
