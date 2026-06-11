import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../../app.js';
import * as service from './service.js';

const registerSchema = z.object({
  hostname: z.string().min(1),
  os: z.string().optional(),
  arch: z.string().optional(),
});

export async function machinesRoutes(app: FastifyInstance) {
  app.get('/machines', { preHandler: [requireRole('operator')] }, async (_request, reply) => {
    const machines = await service.listMachines();
    return reply.send(machines);
  });

  app.post(
    '/machines/register',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const result = registerSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: 'invalid input', issues: result.error.issues });
      }

      try {
        const { machine, token } = await service.registerMachine(result.data);
        return reply.status(201).send({ id: machine.id, hostname: machine.hostname, token });
      } catch (err) {
        if (err instanceof service.MachineConnectedError) {
          return reply.status(409).send({ error: 'machine already connected' });
        }
        throw err;
      }
    },
  );
}
