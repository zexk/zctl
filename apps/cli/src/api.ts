import type { Config } from './config.js';

export interface Machine {
  id: string;
  hostname: string;
  os: string | null;
  arch: string | null;
  lastSeen: string | null;
  createdAt: string;
  status: 'online' | 'offline';
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface Execution {
  id: string;
  machineId: string;
  command: string;
  stdout: string | null;
  stderr: string | null;
  exitCode: number | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

async function request<T>(config: Config, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${config.url}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${res.status} ${(err as { error?: string }).error ?? res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  machines: (config: Config) => request<Machine[]>(config, 'GET', '/machines'),
  exec: (config: Config, hostname: string, command: string) =>
    request<ExecResult>(config, 'POST', `/machines/${hostname}/exec`, { command }),
  executions: (config: Config, hostname: string) =>
    request<Execution[]>(config, 'GET', `/machines/${hostname}/executions`),
};
