import type { FastifyRequest, FastifyReply } from 'fastify';

export async function healthRoute(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ status: 'ok', timestamp: Date.now() });
}
