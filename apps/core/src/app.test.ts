import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';

vi.mock('./modules/machines/repository.js', () => ({
  findAll: vi.fn().mockResolvedValue([
    { id: 'uuid-1', hostname: 'machine-a', os: 'linux', arch: 'x86_64', lastSeen: null, createdAt: new Date() },
  ]),
  findByHostname: vi.fn().mockImplementation(async (hostname: string) => {
    if (hostname === 'existing') {
      return { id: 'uuid-1', hostname: 'existing', os: 'linux', arch: 'x86_64', lastSeen: null, createdAt: new Date() };
    }
    return undefined;
  }),
  create: vi.fn().mockImplementation(async (data: any) => ({
    id: 'uuid-new',
    ...data,
    lastSeen: null,
    createdAt: new Date(),
  })),
  updateLastSeen: vi.fn().mockImplementation(async (id: string) => ({
    id, hostname: 'existing', os: 'linux', arch: 'x86_64', lastSeen: new Date(), createdAt: new Date(),
  })),
  touchByHostname: vi.fn().mockResolvedValue(undefined),
}));

import { signToken } from './lib/jwt.js';
import { buildApp } from './app.js';

const operatorToken = signToken({ sub: 'admin', role: 'operator' }, '1h');
const agentToken = signToken({ sub: 'machine-1', role: 'agent', hostname: 'test-host' }, '1h');

describe('auth middleware', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health (public)', () => {
    it('returns 200 without Authorization header', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 'ok' });
    });
  });

  describe('POST /machines/register (public)', () => {
    it('returns 201 without Authorization header', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/machines/register',
        payload: { hostname: 'new-machine', os: 'linux', arch: 'x86_64' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
    });

    it('returns 400 on invalid input', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/machines/register',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('protected routes', () => {
    it.each([
      { url: '/machines', method: 'GET' as const },
      { url: '/machines/some-id/exec', method: 'POST' as const },
      { url: '/machines/some-id/executions', method: 'GET' as const },
    ])('returns 401 on $method $url without Authorization header', async ({ url, method }) => {
      const res = await app.inject({ method, url });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'unauthorized' });
    });

    it.each([
      { url: '/machines', method: 'GET' as const },
      { url: '/machines/some-id/exec', method: 'POST' as const },
      { url: '/machines/some-id/executions', method: 'GET' as const },
    ])('returns 401 on $method $url with invalid Bearer token', async ({ url, method }) => {
      const res = await app.inject({
        method,
        url,
        headers: { authorization: 'Bearer not-a-valid-jwt' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'invalid or expired token' });
    });

    it.each([
      { url: '/machines', method: 'GET' as const },
      { url: '/machines/some-id/exec', method: 'POST' as const },
      { url: '/machines/some-id/executions', method: 'GET' as const },
    ])('returns 403 on $method $url with agent token', async ({ url, method }) => {
      const res = await app.inject({
        method,
        url,
        headers: { authorization: `Bearer ${agentToken}` },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ error: 'forbidden' });
    });
  });

  describe('POST /machines/:id/exec (protected)', () => {
    it('returns 401 without Authorization header', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/machines/test/exec',
        payload: { command: 'echo hi' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 with agent token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/machines/test/exec',
        payload: { command: 'echo hi' },
        headers: { authorization: `Bearer ${agentToken}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /machines with operator token', () => {
    it('returns 200 and machine list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/machines',
        headers: { authorization: `Bearer ${operatorToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0].hostname).toBe('machine-a');
    });
  });
});
