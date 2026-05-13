import { agentRegistry } from '../agents/registry.js';
import { pendingExecs } from './pending.js';

const EXEC_TIMEOUT = 10_000;

export async function executeOnMachine(machineId: string, command: string) {
  const conn = agentRegistry.get(machineId);
  if (!conn) throw new Error('machine not connected');

  const requestId = crypto.randomUUID();

  conn.socket.send(
    JSON.stringify({ type: 'exec', requestId, command }),
  );

  return pendingExecs.add(requestId, EXEC_TIMEOUT);
}
