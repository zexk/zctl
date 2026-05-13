import type { FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { handleConnection } from '../modules/agents/gateway.js';

export function wsHandler(socket: WebSocket, request: FastifyRequest) {
  handleConnection(socket, request);
}
