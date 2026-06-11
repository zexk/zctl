import type { ExecResult } from './types.js';

type PendingEntry = {
  resolve: (result: ExecResult) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  machineId: string;
};

class PendingTracker {
  private pending = new Map<string, PendingEntry>();

  add(requestId: string, machineId: string, timeoutMs: number): Promise<ExecResult> {
    if (this.pending.has(requestId)) {
      return Promise.reject(new Error(`duplicate requestId: ${requestId}`));
    }
    return new Promise<ExecResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('execution timed out'));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timer, machineId });
    });
  }

  // machineId must match the machine the exec was dispatched to, so one
  // agent cannot complete another machine's execution.
  resolve(requestId: string, machineId: string, result: ExecResult): void {
    const entry = this.pending.get(requestId);
    if (!entry || entry.machineId !== machineId) return;
    clearTimeout(entry.timer);
    this.pending.delete(requestId);
    entry.resolve(result);
  }

  rejectForMachine(machineId: string, error: Error): void {
    for (const [requestId, entry] of this.pending.entries()) {
      if (entry.machineId === machineId) {
        clearTimeout(entry.timer);
        this.pending.delete(requestId);
        entry.reject(error);
      }
    }
  }

  rejectAll(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error('server shutting down'));
    }
    this.pending.clear();
  }
}

export const pendingExecs = new PendingTracker();
