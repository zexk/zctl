import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as service from './service.js';

const registerSchema = z.object({
  hostname: z.string().min(1),
  os: z.string().optional(),
  arch: z.string().optional(),
});

export async function machinesRoutes(app: FastifyInstance) {
  app.get('/machines', async (_request, reply) => {
    const machines = await service.listMachines();
    return reply.send(machines);
  });

  app.post('/machines/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'invalid input', issues: result.error.issues });
    }

    const machine = await service.registerMachine(result.data);
    return reply.status(201).send({ id: machine.id, hostname: machine.hostname });
  });
}
