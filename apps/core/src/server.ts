import { env } from './config/env.js';
import { buildApp } from './app.js';
import { verifyConnection } from './db/index.js';
import { agentRegistry } from './modules/agents/registry.js';

export async function startServer() {
  const app = await buildApp({ logger: true });

  try {
    await verifyConnection();
  } catch (err) {
    app.log.fatal(err, 'database connection failed');
    process.exit(1);
  }
  app.log.info('database connected');

  const shutdown = async () => {
    app.log.info('shutting down...');
    agentRegistry.closeAll();
    await app.close();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`core listening on ${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.fatal(err);
    process.exit(1);
  }
}
