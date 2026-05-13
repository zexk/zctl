import type { WebSocket } from '@fastify/websocket';

export type AgentConnection = {
  machineId: string;
  socket: WebSocket;
  connectedAt: Date;
};
