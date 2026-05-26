import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from './jwt.js';

const SECRET = process.env.JWT_SECRET ?? 'test-secret';
const PAYLOAD = { sub: 'test-id', role: 'agent' as const, hostname: 'test-host' };

describe('signToken', () => {
  it('returns a valid JWT string', () => {
    const token = signToken(PAYLOAD, '1h');
    const decoded = jwt.verify(token, SECRET) as any;
    expect(decoded.sub).toBe('test-id');
    expect(decoded.role).toBe('agent');
    expect(decoded.hostname).toBe('test-host');
  });

  it('includes an expiration claim', () => {
    const token = signToken(PAYLOAD, '1h');
    const decoded = jwt.verify(token, SECRET) as any;
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
  });

  it('accepts operator role', () => {
    const token = signToken({ sub: 'operator', role: 'operator' }, '90d');
    const decoded = jwt.verify(token, SECRET) as any;
    expect(decoded.role).toBe('operator');
  });
});

describe('verifyToken', () => {
  it('decodes a valid token', () => {
    const token = signToken(PAYLOAD, '1h');
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe('test-id');
    expect(decoded.role).toBe('agent');
  });

  it('throws on a token signed with a different secret', () => {
    const token = jwt.sign(PAYLOAD, 'wrong-secret');
    expect(() => verifyToken(token)).toThrow();
  });

  it('throws on a garbage string', () => {
    expect(() => verifyToken('not-a-token')).toThrow();
  });

  it('throws on an expired token', () => {
    const token = signToken(PAYLOAD, '0s');
    expect(() => verifyToken(token)).toThrow();
  });
});
