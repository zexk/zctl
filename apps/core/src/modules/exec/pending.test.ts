import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./types.js', () => ({}));

// Import the class indirectly by re-implementing a local instance for testing
// (PendingTracker is not exported separately, so we test via pendingExecs)
import { pendingExecs } from './pending.js';

describe('PendingTracker', () => {
  beforeEach(() => {
    pendingExecs.rejectAll();
  });

  it('resolves the correct promise by requestId', async () => {
    const p = pendingExecs.add('req-1', 'machine-a', 5000);
    pendingExecs.resolve('req-1', 'machine-a', {
      type: 'exec_result',
      requestId: 'req-1',
      stdout: 'hi',
      stderr: '',
      exitCode: 0,
    });
    await expect(p).resolves.toMatchObject({ stdout: 'hi' });
  });

  it('ignores a resolve from a different machine', async () => {
    const p = pendingExecs.add('req-x', 'machine-a', 5000);
    pendingExecs.resolve('req-x', 'machine-b', {
      type: 'exec_result',
      requestId: 'req-x',
      stdout: 'forged',
      stderr: '',
      exitCode: 0,
    });

    // still pending — the rightful machine can resolve it
    pendingExecs.resolve('req-x', 'machine-a', {
      type: 'exec_result',
      requestId: 'req-x',
      stdout: 'real',
      stderr: '',
      exitCode: 0,
    });
    await expect(p).resolves.toMatchObject({ stdout: 'real' });
  });

  it('rejectForMachine rejects only entries for the given machine', async () => {
    const pA = pendingExecs.add('req-a', 'machine-a', 5000);
    const pB = pendingExecs.add('req-b', 'machine-b', 5000);

    pendingExecs.rejectForMachine('machine-a', new Error('disconnected'));

    await expect(pA).rejects.toThrow('disconnected');

    // machine-b entry is still pending — resolve it cleanly
    pendingExecs.resolve('req-b', 'machine-b', {
      type: 'exec_result',
      requestId: 'req-b',
      stdout: '',
      stderr: '',
      exitCode: 0,
    });
    await expect(pB).resolves.toBeDefined();
  });

  it('rejectForMachine clears the timeout for rejected entries', async () => {
    vi.useFakeTimers();
    const p = pendingExecs.add('req-c', 'machine-c', 1000);
    pendingExecs.rejectForMachine('machine-c', new Error('gone'));
    // Advance past the original timeout — should not cause an unhandled rejection
    vi.advanceTimersByTime(2000);
    await expect(p).rejects.toThrow('gone');
    vi.useRealTimers();
  });

  it('rejectForMachine is a no-op when no entries match', () => {
    expect(() => pendingExecs.rejectForMachine('nonexistent', new Error('x'))).not.toThrow();
  });
});
