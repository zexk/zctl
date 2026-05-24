import { describe, it, expect } from 'vitest';
import { envSchema } from './index.js';

describe('envSchema', () => {
  it('requires JWT_SECRET with minimum length', () => {
    expect(() => envSchema.parse({})).toThrow('JWT_SECRET');
    expect(() => envSchema.parse({ JWT_SECRET: 'short' })).toThrow(
      'JWT_SECRET must be at least 32 characters',
    );

    const env = envSchema.parse({ JWT_SECRET: 'a'.repeat(32) });
    expect(env.JWT_SECRET).toBe('a'.repeat(32));
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.PORT).toBe(3000);
    expect(env.HOST).toBe('0.0.0.0');
  });
});
