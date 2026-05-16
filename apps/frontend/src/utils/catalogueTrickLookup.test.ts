import { describe, expect, it } from 'vitest';
import { findTrickIdByName } from './catalogueTrickLookup';

describe('findTrickIdByName', () => {
  const tricks = [
    { id: 1, name: '3 balles cascade' },
    { id: 2, name: 'Colonnes' },
  ] as Parameters<typeof findTrickIdByName>[1];

  it('matches case-insensitively with trim', () => {
    expect(findTrickIdByName('  colonnes  ', tricks)).toBe(2);
  });

  it('returns null when not found', () => {
    expect(findTrickIdByName('Club passing', tricks)).toBeNull();
  });
});
