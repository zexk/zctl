import 'dotenv/config';
import { loadEnv } from '@zctl/config';
import { buildApp } from './app.js';

const env = loadEnv();

const app = await buildApp({ logger: true });

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`core listening on ${env.HOST}:${env.PORT}`);
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}
