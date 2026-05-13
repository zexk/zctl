import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { healthRoute } from './routes/health.js';
import { wsHandler } from './ws/handler.js';
import { machinesRoutes } from './modules/machines/routes.js';
import { execRoutes } from './modules/exec/routes.js';
import { executionsRoutes } from './modules/executions/routes.js';

export async function buildApp(opts: { logger: boolean }) {
  const app = Fastify(opts);

  await app.register(cors);
  await app.register(fastifyWebsocket);

  app.get('/health', healthRoute);

  app.register(machinesRoutes);
  app.register(execRoutes);
  app.register(executionsRoutes);

  app.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, wsHandler);
  });

  return app;
}
