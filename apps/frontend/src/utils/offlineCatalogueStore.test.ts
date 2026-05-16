import { describe, expect, it } from 'vitest';
import { filterTricks, paginateTricks } from './offlineCatalogueStore';
import type { TrickResponse } from '../api/catalogueApi';

const tricks: TrickResponse[] = [
  {
    id: 1,
    name: 'Cascade',
    siteswap: '3',
    description: 'Base trois balles',
    jugglingLabAnimationUrl: null,
    difficultyScore: 2,
    estimatedLearningDuration: 30,
    popular: true,
    levelName: 'Beginner',
    categoryName: 'Balles',
    prerequisiteNames: [],
  },
  {
    id: 2,
    name: 'Flash',
    siteswap: null,
    description: 'Éclair',
    jugglingLabAnimationUrl: null,
    difficultyScore: 8,
    estimatedLearningDuration: 60,
    popular: false,
    levelName: 'Advanced',
    categoryName: 'Balles',
    prerequisiteNames: [],
  },
];

describe('offlineCatalogueStore', () => {
  it('filters by level and search', () => {
    const filtered = filterTricks(tricks, { level: 'Beginner', search: 'cas' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Cascade');
  });

  it('paginates client-side', () => {
    const page = paginateTricks(tricks, 0, 1);
    expect(page.content).toHaveLength(1);
    expect(page.totalPages).toBe(2);
    expect(page.totalElements).toBe(2);
  });
});
