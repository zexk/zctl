import { signToken } from '../../lib/jwt.js';
import { env } from '../../config/env.js';
import { agentRegistry } from '../agents/registry.js';
import * as repository from './repository.js';

export class MachineConnectedError extends Error {
  constructor(hostname: string) {
    super(`machine ${hostname} already has a connected agent`);
  }
}

const OFFLINE_THRESHOLD_MS = 30_000;

function computeStatus(lastSeen: Date | null): 'online' | 'offline' {
  if (!lastSeen) return 'offline';
  return Date.now() - new Date(lastSeen).getTime() < OFFLINE_THRESHOLD_MS ? 'online' : 'offline';
}

export async function listMachines() {
  const machines = await repository.findAll();
  return machines.map((m) => ({
    ...m,
    status: computeStatus(m.lastSeen),
  }));
}

export async function registerMachine(input: { hostname: string; os?: string; arch?: string }) {
  let machine;
  const existing = await repository.findByHostname(input.hostname);
  if (existing) {
    // While an agent holds a live connection, re-registering its hostname
    // would mint a token that lets the caller evict it and impersonate the
    // machine. Restarted agents are fine: their socket closes first.
    if (agentRegistry.get(input.hostname)) {
      throw new MachineConnectedError(input.hostname);
    }
    machine = await repository.updateLastSeen(existing.id);
  } else {
    machine = await repository.create(input);
  }

  const token = signToken(
    { sub: machine.id, role: 'agent', hostname: machine.hostname },
    env.JWT_EXPIRY_AGENT,
  );

  return { machine, token };
}
