import type { ExecResult } from './types.js';

type PendingEntry = {
  resolve: (result: ExecResult) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

class PendingTracker {
  private pending = new Map<string, PendingEntry>();

  add(requestId: string, timeoutMs: number): Promise<ExecResult> {
    return new Promise<ExecResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('execution timed out'));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });
    });
  }

  resolve(requestId: string, result: ExecResult): void {
    const entry = this.pending.get(requestId);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(requestId);
    entry.resolve(result);
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
