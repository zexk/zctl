import * as repository from './repository.js';

const OFFLINE_THRESHOLD_MS = 30_000;

function computeStatus(lastSeen: Date | null): 'online' | 'offline' {
  if (!lastSeen) return 'offline';
  return Date.now() - new Date(lastSeen).getTime() < OFFLINE_THRESHOLD_MS
    ? 'online'
    : 'offline';
}

export async function listMachines() {
  const machines = await repository.findAll();
  return machines.map((m) => ({
    ...m,
    status: computeStatus(m.lastSeen),
  }));
}

export async function registerMachine(input: { hostname: string; os?: string; arch?: string }) {
  const existing = await repository.findByHostname(input.hostname);
  if (existing) {
    return repository.updateLastSeen(existing.id);
  }
  return repository.create(input);
}
