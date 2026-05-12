import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().default('postgres://zctl:zctl@localhost:5432/zctl'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
