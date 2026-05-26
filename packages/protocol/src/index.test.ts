import { describe, it, expect } from 'vitest';
import {
  AuthSchema,
  AuthOkSchema,
  AuthErrorSchema,
  ServerMessageSchema,
  AgentMessageSchema,
} from './index.js';

describe('AuthSchema', () => {
  it('parses a valid auth message', () => {
    const result = AuthSchema.parse({ type: 'auth', token: 'some-jwt-token' });
    expect(result).toEqual({ type: 'auth', token: 'some-jwt-token' });
  });

  it('rejects a message without a token', () => {
    expect(() => AuthSchema.parse({ type: 'auth' })).toThrow();
  });

  it('rejects a message with the wrong type', () => {
    expect(() => AuthSchema.parse({ type: 'hello', token: 'x' })).toThrow();
  });
});

describe('AuthOkSchema', () => {
  it('parses a valid auth_ok message', () => {
    const result = AuthOkSchema.parse({ type: 'auth_ok' });
    expect(result).toEqual({ type: 'auth_ok' });
  });

  it('rejects an auth_ok with extra fields', () => {
    expect(() => AuthOkSchema.parse({ type: 'auth_ok', extra: true })).toThrow();
  });
});

describe('AuthErrorSchema', () => {
  it('parses a valid auth_error with reason', () => {
    const result = AuthErrorSchema.parse({ type: 'auth_error', reason: 'bad token' });
    expect(result).toEqual({ type: 'auth_error', reason: 'bad token' });
  });

  it('rejects an auth_error without a reason', () => {
    expect(() => AuthErrorSchema.parse({ type: 'auth_error' })).toThrow();
  });
});

describe('ServerMessageSchema', () => {
  it('accepts auth_ok', () => {
    const result = ServerMessageSchema.parse({ type: 'auth_ok' });
    expect(result.type).toBe('auth_ok');
  });

  it('accepts auth_error', () => {
    const result = ServerMessageSchema.parse({ type: 'auth_error', reason: 'nope' });
    expect(result.type).toBe('auth_error');
  });

  it('accepts exec', () => {
    const result = ServerMessageSchema.parse({
      type: 'exec',
      requestId: 'r1',
      command: 'ls',
    });
    expect(result.type).toBe('exec');
  });

  it('rejects an unknown message type', () => {
    expect(() => ServerMessageSchema.parse({ type: 'unknown' })).toThrow();
  });
});

describe('AgentMessageSchema', () => {
  it('accepts auth', () => {
    const result = AgentMessageSchema.parse({ type: 'auth', token: 't' });
    expect(result.type).toBe('auth');
  });

  it('accepts heartbeat', () => {
    const result = AgentMessageSchema.parse({ type: 'heartbeat', machineId: 'm1', timestamp: 1 });
    expect(result.type).toBe('heartbeat');
  });

  it('accepts exec_result', () => {
    const result = AgentMessageSchema.parse({
      type: 'exec_result',
      requestId: 'r1',
      exitCode: 0,
      stdout: '',
      stderr: '',
    });
    expect(result.type).toBe('exec_result');
  });
});
