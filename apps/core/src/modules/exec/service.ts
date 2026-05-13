import { agentRegistry } from '../agents/registry.js';
import { pendingExecs } from './pending.js';
import { findByHostname } from '../machines/repository.js';
import * as executions from '../executions/service.js';

const EXEC_TIMEOUT = 10_000;

export async function executeOnMachine(hostname: string, command: string) {
  const machine = await findByHostname(hostname);
  if (!machine) throw new Error('machine not found');

  const conn = agentRegistry.get(hostname);
  if (!conn) throw new Error('machine not connected');

  const execution = await executions.createExecution(machine.id, command);
  const requestId = crypto.randomUUID();

  conn.socket.send(
    JSON.stringify({ type: 'exec', requestId, command }),
  );

  try {
    const result = await pendingExecs.add(requestId, EXEC_TIMEOUT);
    await executions.completeExecution(execution.id, result);
    return result;
  } catch (err) {
    await executions.failExecution(execution.id);
    throw err;
  }
}
