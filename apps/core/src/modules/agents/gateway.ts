import type { FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { verifyToken } from '../../lib/jwt.js';
import type { ZctlJwtPayload } from '../../lib/jwt.js';
import { agentRegistry } from './registry.js';
import { pendingExecs } from '../exec/pending.js';
import { touchByHostname } from '../machines/repository.js';

function send(socket: WebSocket, msg: Record<string, unknown>) {
  socket.send(JSON.stringify(msg));
}

function handleConnection(socket: WebSocket, request: FastifyRequest) {
  const machineId = (request.query as { machineId?: string }).machineId;
  if (!machineId) {
    socket.close(4001, 'machineId required');
    return;
  }

  let authenticated = false;

  socket.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      if (!authenticated) {
        if (msg.type === 'auth') {
          let payload: ZctlJwtPayload;
          try {
            payload = verifyToken(msg.token);
          } catch {
            send(socket, { type: 'auth_error', reason: 'invalid or expired token' });
            socket.close(4001, 'auth failed');
            return;
          }

          if (payload.role !== 'agent') {
            send(socket, { type: 'auth_error', reason: 'invalid role' });
            socket.close(4001, 'auth failed');
            return;
          }

          if (payload.hostname !== machineId) {
            send(socket, { type: 'auth_error', reason: 'hostname mismatch' });
            socket.close(4001, 'auth failed');
            return;
          }

          authenticated = true;
          send(socket, { type: 'auth_ok' });
          request.log.info({ machineId }, 'agent authenticated');
          return;
        }

        socket.close(4001, 'auth required');
        return;
      }

      if (msg.type === 'hello') {
        agentRegistry.add(msg.machineId, socket);
        request.log.info({ machineId: msg.machineId }, 'agent connected');
        return;
      }

      if (msg.type === 'heartbeat') {
        touchByHostname(machineId).catch(() => {});
        return;
      }

      if (msg.type === 'exec_result') {
        pendingExecs.resolve(msg.requestId, msg);
        return;
      }
    } catch {
      send(socket, { type: 'error', message: 'invalid message' });
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

export { handleConnection };
