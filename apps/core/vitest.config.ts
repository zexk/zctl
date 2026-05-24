import { defineConfig } from 'vitest/config';

process.env.JWT_SECRET = 'test-secret-with-sufficient-length-32chars';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/zctl_test';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
  },
});
