import type { FastifyInstance } from 'fastify';
import * as service from './service.js';

export async function machinesRoutes(app: FastifyInstance) {
  app.get('/machines', async (_request, reply) => {
    const machines = await service.listMachines();
    return reply.send(machines);
  });
}
