import type { FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { agentRegistry } from './registry.js';
import { pendingExecs } from '../exec/pending.js';

export function handleConnection(socket: WebSocket, request: FastifyRequest) {
  const machineId = (request.query as { machineId?: string }).machineId;
  if (!machineId) {
    socket.close(4001, 'machineId required');
    return;
  }

  socket.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'hello') {
        agentRegistry.add(msg.machineId, socket);
        request.log.info({ machineId: msg.machineId }, 'agent connected');
        return;
      }

      if (msg.type === 'exec_result') {
        pendingExecs.resolve(msg.requestId, msg);
        return;
      }
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'invalid message' }));
    }
  });

  socket.on('close', () => {
    agentRegistry.remove(machineId);
    request.log.info({ machineId }, 'agent disconnected');
  });

  socket.on('error', () => {
    agentRegistry.remove(machineId);
  });
}
