import type { FastifyInstance } from 'fastify';
import { findByHostname } from '../machines/repository.js';
import * as service from './service.js';

export async function executionsRoutes(app: FastifyInstance) {
  app.get('/machines/:id/executions', async (request, reply) => {
    const hostname = request.params as { id: string };
    const machine = await findByHostname(hostname.id);
    if (!machine) return reply.status(404).send({ error: 'machine not found' });

    const executions = await service.listExecutions(machine.id);
    return reply.send(executions);
  });
}
