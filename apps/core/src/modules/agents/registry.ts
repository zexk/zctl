import type { AgentConnection } from './types.js';
import type { WebSocket } from '@fastify/websocket';

class AgentRegistry {
  private connections = new Map<string, AgentConnection>();

  add(machineId: string, socket: WebSocket): void {
    const existing = this.connections.get(machineId);
    if (existing) {
      try {
        existing.socket.close();
      } catch {}
    }
    this.connections.set(machineId, { machineId, socket, connectedAt: new Date() });
  }

  // Only removes when `socket` is still the registered connection, so a stale
  // socket's close event (e.g. after being evicted by add) cannot drop a newer
  // connection for the same machine. Returns whether an entry was removed.
  remove(machineId: string, socket: WebSocket): boolean {
    const existing = this.connections.get(machineId);
    if (!existing || existing.socket !== socket) return false;
    this.connections.delete(machineId);
    return true;
  }

  get(machineId: string): AgentConnection | undefined {
    return this.connections.get(machineId);
  }

  list(): AgentConnection[] {
    return Array.from(this.connections.values());
  }

  closeAll(): void {
    for (const conn of this.connections.values()) {
      try {
        conn.socket.close();
      } catch {}
    }
    this.connections.clear();
  }
}

export const agentRegistry = new AgentRegistry();
