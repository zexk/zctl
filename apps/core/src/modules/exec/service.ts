import { agentRegistry } from '../agents/registry.js';
import { pendingExecs } from './pending.js';
import { findByHostname } from '../machines/repository.js';
import * as executions from '../executions/service.js';
import { env } from '../../config/env.js';

const MAX_OUTPUT_CHARS = 1_000_000;

export async function executeOnMachine(hostname: string, command: string, timeoutMs?: number) {
  const machine = await findByHostname(hostname);
  if (!machine) throw new Error('machine not found');

  const conn = agentRegistry.get(hostname);
  if (!conn) throw new Error('machine not connected');

  const execution = await executions.createExecution(machine.id, command);
  const requestId = crypto.randomUUID();

  try {
    conn.socket.send(JSON.stringify({ type: 'exec', requestId, command }));
    const result = await pendingExecs.add(requestId, hostname, timeoutMs ?? env.EXEC_TIMEOUT_MS);
    await executions.completeExecution(execution.id, {
      stdout: result.stdout.slice(0, MAX_OUTPUT_CHARS),
      stderr: result.stderr.slice(0, MAX_OUTPUT_CHARS),
      exitCode: result.exitCode,
    });
    return result;
  } catch (err) {
    await executions.failExecution(execution.id);
    throw err;
  }
}
