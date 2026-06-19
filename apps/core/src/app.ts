import Fastify from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { healthRoute } from './routes/health.js';
import { dashboardRoute } from './routes/dashboard.js';
import { wsHandler } from './ws/handler.js';
import { machinesRoutes } from './modules/machines/routes.js';
import { execRoutes } from './modules/exec/routes.js';
import { executionsRoutes } from './modules/executions/routes.js';
import { verifyToken } from './lib/jwt.js';
import type { ZctlJwtPayload } from './lib/jwt.js';
import { env } from './config/env.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: ZctlJwtPayload;
  }
}

const PUBLIC_PATHS = new Set(['/health', '/dashboard', '/machines/register', '/ws']);

function pathname(url: string): string {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

export async function buildApp(opts: { logger: boolean }) {
  const app = Fastify(opts);

  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(rateLimit, { global: false });
  await app.register(fastifyWebsocket);

  app.addHook('onRequest', async (request, reply) => {
    if (PUBLIC_PATHS.has(pathname(request.url))) return;

    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'unauthorized' });
    }

    try {
      request.user = verifyToken(auth.slice(7));
    } catch {
      return reply.status(401).send({ error: 'invalid or expired token' });
    }
  });

  app.get('/health', healthRoute);

  app.register(dashboardRoute);
  app.register(machinesRoutes);
  app.register(execRoutes);
  app.register(executionsRoutes);

  app.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, wsHandler);
  });

  return app;
}

export function requireRole(role: ZctlJwtPayload['role']) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || request.user.role !== role) {
      return reply.status(403).send({ error: 'forbidden' });
    }
  };
}
