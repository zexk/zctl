import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { executeOnMachine } from './service.js';

const execBodySchema = z.object({
  command: z.string().min(1),
});

export async function execRoutes(app: FastifyInstance) {
  app.post('/machines/:id/exec', async (request, reply) => {
    const body = execBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'invalid input', issues: body.error.issues });
    }

    const { id } = request.params as { id: string };

    try {
      const result = await executeOnMachine(id, body.data.command);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'execution failed';
      return reply.status(502).send({ error: message });
    }
  });
}
