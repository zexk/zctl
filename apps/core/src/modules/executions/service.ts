import * as repository from './repository.js';

export async function createExecution(machineId: string, command: string) {
  return repository.create(machineId, command);
}

export async function completeExecution(
  id: string,
  result: { stdout: string; stderr: string; exitCode: number },
) {
  return repository.updateResult(id, result);
}

export async function failExecution(id: string) {
  return repository.markTimeout(id);
}

export async function listExecutions(machineId: string) {
  return repository.findByMachineId(machineId);
}
