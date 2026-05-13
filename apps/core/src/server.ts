import { env } from './config/env.js';
import { buildApp } from './app.js';

export async function startServer() {
  const app = await buildApp({ logger: true });

  const shutdown = async () => {
    app.log.info('shutting down...');
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
