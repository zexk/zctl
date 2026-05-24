import { describe, it, expect } from 'vitest';
import { envSchema } from './index.js';

describe('envSchema', () => {
  it('provides default values', () => {
    const env = envSchema.parse({});
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.PORT).toBe(3000);
    expect(env.HOST).toBe('0.0.0.0');
    expect(env.JWT_SECRET).toBeDefined();
  });
});
