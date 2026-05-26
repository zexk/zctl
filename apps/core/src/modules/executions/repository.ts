import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { commandExecutions } from '../../db/schema/executions.js';
import type { CommandExecution } from '../../db/schema/executions.js';

export async function create(machineId: string, command: string): Promise<CommandExecution> {
  const rows = await db.insert(commandExecutions).values({ machineId, command }).returning();
  return rows[0];
}

export async function updateResult(
  id: string,
  result: { stdout: string; stderr: string; exitCode: number },
): Promise<void> {
  await db
    .update(commandExecutions)
    .set({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(commandExecutions.id, id));
}

export async function markTimeout(id: string): Promise<void> {
  await db
    .update(commandExecutions)
    .set({
      status: 'timeout',
      completedAt: new Date(),
    })
    .where(eq(commandExecutions.id, id));
}

export async function findByMachineId(machineId: string): Promise<CommandExecution[]> {
  return db
    .select()
    .from(commandExecutions)
    .where(eq(commandExecutions.machineId, machineId))
    .orderBy(desc(commandExecutions.createdAt));
}
