import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyConnection } from '../db/index.js';

export async function healthRoute(_request: FastifyRequest, reply: FastifyReply) {
  try {
    await verifyConnection();
    return reply.send({ status: 'ok', timestamp: Date.now() });
  } catch {
    return reply.status(503).send({ status: 'error', error: 'database unavailable' });
  }
}
