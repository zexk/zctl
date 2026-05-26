import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { db } from './db/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = process.env.MIGRATIONS_FOLDER ?? resolve(__dirname, '../drizzle');

await migrate(db, { migrationsFolder });
process.exit(0);
