import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LearningPath } from '../api/studentApi';
import { computePathCompletionPercent } from './pathProgress';
import * as lookup from './catalogueTrickLookup';

const path: LearningPath = {
  id: 1,
  pathName: 'Test',
  description: '',
  targetLevel: null,
  estimatedDurationDays: null,
  stepCount: 2,
  trickNames: ['Cascade', 'Colonnes'],
};

describe('computePathCompletionPercent', () => {
  beforeEach(() => {
    vi.spyOn(lookup, 'resolveTrickIdsForPath').mockResolvedValue(
      new Map([
        ['Cascade', 10],
        ['Colonnes', 20],
      ]),
    );
  });

  it('returns percent of mastered steps in path', async () => {
    const pct = await computePathCompletionPercent(path, {
      10: 'MASTERED',
      20: 'IN_PROGRESS',
    });
    expect(pct).toBe(50);
  });

  it('returns 0 when stepCount is 0', async () => {
    const pct = await computePathCompletionPercent(
      { ...path, stepCount: 0, trickNames: [] },
      {},
    );
    expect(pct).toBe(0);
  });
});
