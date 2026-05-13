import * as repository from './repository.js';

export async function listMachines() {
  return repository.findAll();
}

export async function registerMachine(input: { hostname: string; os?: string; arch?: string }) {
  const existing = await repository.findByHostname(input.hostname);
  if (existing) {
    return repository.updateLastSeen(existing.id);
  }
  return repository.create(input);
}
