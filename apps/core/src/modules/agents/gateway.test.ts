import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./registry.js', () => ({
  agentRegistry: {
    add: vi.fn(),
    remove: vi.fn().mockReturnValue(true),
    get: vi.fn(),
    list: vi.fn(),
    closeAll: vi.fn(),
  },
}));

vi.mock('../exec/pending.js', () => ({
  pendingExecs: {
    resolve: vi.fn(),
    rejectAll: vi.fn(),
    rejectForMachine: vi.fn(),
  },
}));

vi.mock('../machines/repository.js', () => ({
  touchByHostname: vi.fn().mockResolvedValue(undefined),
}));

import type { WebSocket } from '@fastify/websocket';
import { handleConnection } from './gateway.js';
import { agentRegistry } from './registry.js';
import { pendingExecs } from '../exec/pending.js';
import { touchByHostname } from '../machines/repository.js';
import { signToken } from '../../lib/jwt.js';

const agentToken = signToken({ sub: 'uuid-1', role: 'agent', hostname: 'test-host' }, '1h');

function mockSocket(): WebSocket & { _emit(event: string, ...args: any[]): void } {
  const handlers: Record<string, (...args: any[]) => void> = {};
  return {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      handlers[event] = handler;
    }) as any,
    send: vi.fn() as any,
    close: vi.fn() as any,
    _emit(event: string, ...args: any[]) {
      handlers[event]?.(...args);
    },
  } as any;
}

function mockRequest(machineId: string) {
  return {
    query: { machineId },
    log: { info: vi.fn() },
  } as any;
}

function sendJson(socket: any, obj: Record<string, unknown>) {
  socket._emit('message', Buffer.from(JSON.stringify(obj)));
}

describe('handleConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes with 4001 if machineId is missing', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest(''));
    expect(socket.close).toHaveBeenCalledWith(4001, 'machineId required');
  });

  it('closes with 4001 if first message is not auth', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'hello', machineId: 'test-host' });
    expect(socket.close).toHaveBeenCalledWith(4001, 'auth required');
  });

  it('sends auth_ok for a valid agent token', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'auth', token: agentToken });
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'auth_ok' }));
  });

  it('rejects an invalid token', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'auth', token: 'bad-token' });
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'auth_error', reason: 'invalid or expired token' }),
    );
    expect(socket.close).toHaveBeenCalledWith(4001, 'auth failed');
  });

  it('rejects an operator token (wrong role)', () => {
    const opToken = signToken({ sub: 'admin', role: 'operator' }, '1h');
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'auth', token: opToken });
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'auth_error', reason: 'invalid role' }),
    );
    expect(socket.close).toHaveBeenCalledWith(4001, 'auth failed');
  });

  it('rejects a token whose hostname does not match the query param', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('wrong-host'));
    sendJson(socket, { type: 'auth', token: agentToken });
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'auth_error', reason: 'hostname mismatch' }),
    );
    expect(socket.close).toHaveBeenCalledWith(4001, 'auth failed');
  });

  it('registers the agent after auth + hello', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'auth', token: agentToken });
    expect(agentRegistry.add).not.toHaveBeenCalled();
    sendJson(socket, { type: 'hello', machineId: 'test-host' });
    expect(agentRegistry.add).toHaveBeenCalledWith('test-host', socket);
  });

  it('forwards heartbeat to touchByHostname after auth', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'auth', token: agentToken });
    sendJson(socket, { type: 'heartbeat', machineId: 'test-host', timestamp: Date.now() });
    expect(touchByHostname).toHaveBeenCalledWith('test-host');
  });

  it('forwards exec_result to pendingExecs.resolve after auth', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'auth', token: agentToken });
    sendJson(socket, {
      type: 'exec_result',
      requestId: 'req-1',
      exitCode: 0,
      stdout: '',
      stderr: '',
    });
    expect(pendingExecs.resolve).toHaveBeenCalledWith(
      'req-1',
      'test-host',
      expect.objectContaining({ requestId: 'req-1' }),
    );
  });

  it('rejects pending execs for machine on disconnect', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'auth', token: agentToken });
    sendJson(socket, { type: 'hello', machineId: 'test-host' });
    socket._emit('close');
    expect(agentRegistry.remove).toHaveBeenCalledWith('test-host', socket);
    expect(pendingExecs.rejectForMachine).toHaveBeenCalledWith('test-host', expect.any(Error));
  });

  it('does not reject pending execs when a stale socket closes', () => {
    vi.mocked(agentRegistry.remove).mockReturnValueOnce(false);
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'auth', token: agentToken });
    sendJson(socket, { type: 'hello', machineId: 'test-host' });
    socket._emit('close');
    expect(pendingExecs.rejectForMachine).not.toHaveBeenCalled();
  });

  it('does not process messages before auth', () => {
    const socket = mockSocket();
    handleConnection(socket, mockRequest('test-host'));
    sendJson(socket, { type: 'heartbeat', machineId: 'test-host' });
    expect(touchByHostname).not.toHaveBeenCalled();
    sendJson(socket, { type: 'exec_result', requestId: 'req-1' });
    expect(pendingExecs.resolve).not.toHaveBeenCalled();
  });
});
