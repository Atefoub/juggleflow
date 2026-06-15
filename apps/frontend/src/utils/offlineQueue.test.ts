import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  enqueueProgressUpdate,
  mergePendingIntoProgress,
  getPendingProgressUpdates,
  flushProgressUpdates,
} from './offlineQueue';

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mergePendingIntoProgress overrides status for pending trick', () => {
    enqueueProgressUpdate(42, { trickId: 7, status: 'MASTERED' });
    const merged = mergePendingIntoProgress(42, [
      { trickId: 7, trickName: 'Cascade', status: 'IN_PROGRESS', masteryScore: 3, updatedAt: null },
    ]);
    expect(merged.find((p) => p.trickId === 7)?.status).toBe('MASTERED');
    expect(getPendingProgressUpdates(42)).toHaveLength(1);
  });

  it('mergePendingIntoProgress fournit des valeurs par défaut pour un trickId absent de items', () => {
    enqueueProgressUpdate(42, { trickId: 99, status: 'MASTERED', masteryScore: 80 });
    const merged = mergePendingIntoProgress(42, [
      { trickId: 1, trickName: 'Cascade', status: 'MASTERED', masteryScore: 100, updatedAt: '2026-01-01' },
    ]);
    const pending = merged.find((p) => p.trickId === 99);
    expect(pending).toBeDefined();
    expect(pending?.status).toBe('MASTERED');
    expect(typeof pending?.trickName).toBe('string');
    expect(pending?.trickName).not.toBeUndefined();
    expect(pending?.masteryScore).toBe(80);
    expect(pending?.updatedAt).toBeDefined();
  });

  it('compaction : une seule entrée par trickId (dernière action gagne)', () => {
    enqueueProgressUpdate(1, { trickId: 3, status: 'IN_PROGRESS' });
    enqueueProgressUpdate(1, { trickId: 3, status: 'MASTERED' });
    expect(getPendingProgressUpdates(1)).toHaveLength(1);
    expect(getPendingProgressUpdates(1)[0].status).toBe('MASTERED');
  });

  it('flushProgressUpdates conserve les entrées ajoutées pendant le flush', async () => {
    const userId = 7;
    enqueueProgressUpdate(userId, { trickId: 5, status: 'IN_PROGRESS' });
    const trick5QueuedAt = getPendingProgressUpdates(userId)[0].queuedAt;

    await flushProgressUpdates(userId, async (u) => {
      if (u.trickId === 5) {
        enqueueProgressUpdate(userId, { trickId: 8, status: 'MASTERED' });
        await Promise.resolve();
      }
    });

    const pending = getPendingProgressUpdates(userId);
    expect(pending.some((p) => p.trickId === 8)).toBe(true);
    expect(pending.some((p) => p.trickId === 5 && p.queuedAt === trick5QueuedAt)).toBe(false);
  });

  it('enqueueProgressUpdate notifie les autres onglets via BroadcastChannel', async () => {
    const channel = new BroadcastChannel('juggleflow-progress-queue');
    const received = vi.fn();
    channel.onmessage = received;

    enqueueProgressUpdate(99, { trickId: 1, status: 'MASTERED' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received).toHaveBeenCalled();
    channel.close();
  });
});
