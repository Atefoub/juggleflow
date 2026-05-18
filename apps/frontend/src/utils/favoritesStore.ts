import type { TrickResponse } from '../api/catalogueApi';

const idsKey = (userId: number) => `jf:favorites:${userId}`;
const tricksKey = (userId: number) => `jf:favorites-tricks:${userId}`;

export function getCachedFavoriteIds(userId: number): number[] {
  try {
    const raw = localStorage.getItem(idsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === 'number')
      : [];
  } catch {
    return [];
  }
}

export function setCachedFavoriteIds(userId: number, ids: number[]): void {
  try {
    localStorage.setItem(idsKey(userId), JSON.stringify(ids));
  } catch {
    // quota / private mode
  }
}

export function getCachedFavoriteTricks(userId: number): TrickResponse[] {
  try {
    const raw = localStorage.getItem(tricksKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as TrickResponse[]) : [];
  } catch {
    return [];
  }
}

export function setCachedFavoriteTricks(userId: number, tricks: TrickResponse[]): void {
  try {
    localStorage.setItem(tricksKey(userId), JSON.stringify(tricks));
    setCachedFavoriteIds(
      userId,
      tricks.map((t) => t.id),
    );
  } catch {
    // quota / private mode
  }
}
