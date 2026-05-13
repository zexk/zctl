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

  remove(machineId: string): void {
    this.connections.delete(machineId);
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
