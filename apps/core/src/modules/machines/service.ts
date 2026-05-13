import * as repository from './repository.js';

export async function listMachines() {
  return repository.findAll();
}
