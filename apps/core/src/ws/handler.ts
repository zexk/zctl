import type { FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { AgentMessageSchema } from '@zctl/protocol';

export function wsHandler(socket: WebSocket, _request: FastifyRequest) {
  socket.send(JSON.stringify({ type: 'connected' }));

  socket.on('message', (data: Buffer) => {
    const raw = JSON.parse(data.toString());

    const result = AgentMessageSchema.safeParse(raw);
    if (!result.success) {
      socket.send(JSON.stringify({ type: 'error', message: 'invalid message' }));
      return;
    }

    const msg = result.data;

    switch (msg.type) {
      case 'auth':
        break;
      case 'heartbeat':
        break;
      case 'exec_result':
        break;
    }
  });

  socket.on('close', () => {});
}
