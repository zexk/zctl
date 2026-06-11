import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocket } from '@fastify/websocket';
import { agentRegistry } from './registry.js';

function mockSocket(): WebSocket {
  return { close: vi.fn() } as any;
}

describe('AgentRegistry', () => {
  beforeEach(() => {
    agentRegistry.closeAll();
  });

  it('add closes and replaces an existing connection', () => {
    const oldSocket = mockSocket();
    const newSocket = mockSocket();
    agentRegistry.add('host-a', oldSocket);
    agentRegistry.add('host-a', newSocket);
    expect(oldSocket.close).toHaveBeenCalled();
    expect(agentRegistry.get('host-a')?.socket).toBe(newSocket);
  });

  it('remove ignores a socket that is no longer registered', () => {
    const oldSocket = mockSocket();
    const newSocket = mockSocket();
    agentRegistry.add('host-a', oldSocket);
    agentRegistry.add('host-a', newSocket);

    // stale close event from the evicted socket must not drop the new entry
    expect(agentRegistry.remove('host-a', oldSocket)).toBe(false);
    expect(agentRegistry.get('host-a')?.socket).toBe(newSocket);

    expect(agentRegistry.remove('host-a', newSocket)).toBe(true);
    expect(agentRegistry.get('host-a')).toBeUndefined();
  });

  it('remove is a no-op for unknown machines', () => {
    expect(agentRegistry.remove('nope', mockSocket())).toBe(false);
  });
});
