import { agentRegistry } from '../agents/registry.js';
import { pendingExecs } from './pending.js';
import { findByHostname } from '../machines/repository.js';
import * as executions from '../executions/service.js';
import type { ExecRequest } from './types.js';
import { env } from '../../config/env.js';

const MAX_OUTPUT_CHARS = 1_000_000;

export async function executeOnMachine(hostname: string, command: string, timeoutMs?: number) {
  const machine = await findByHostname(hostname);
  if (!machine) throw new Error('machine not found');

  const conn = agentRegistry.get(hostname);
  if (!conn) throw new Error('machine not connected');

  const execution = await executions.createExecution(machine.id, command);
  const requestId = crypto.randomUUID();

  const msg: ExecRequest = { type: 'exec', requestId, command };
  try {
    conn.socket.send(JSON.stringify(msg));
  } catch {
    await executions.failExecution(execution.id);
    throw new Error('failed to dispatch exec to agent');
  }

  try {
    const result = await pendingExecs.add(requestId, hostname, timeoutMs ?? env.EXEC_TIMEOUT_MS);
    await executions.completeExecution(execution.id, {
      stdout: result.stdout.slice(0, MAX_OUTPUT_CHARS),
      stderr: result.stderr.slice(0, MAX_OUTPUT_CHARS),
      exitCode: result.exitCode,
    });
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === 'execution timed out') {
      await executions.timeoutExecution(execution.id);
    } else {
      await executions.failExecution(execution.id);
    }
    throw err;
  }
}
