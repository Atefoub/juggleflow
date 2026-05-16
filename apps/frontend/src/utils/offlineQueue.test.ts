import { describe, expect, it, beforeEach } from 'vitest';
import {
  enqueueProgressUpdate,
  mergePendingIntoProgress,
  getPendingProgressUpdates,
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
});
