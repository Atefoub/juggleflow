import type { TrickResponse } from '../api/catalogueApi';
import { loadCatalogueSnapshot } from './offlineCatalogueStore';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function findTrickIdByName(
  trickName: string,
  tricks: TrickResponse[],
): number | null {
  const key = normalizeName(trickName);
  const match = tricks.find((t) => normalizeName(t.name) === key);
  return match?.id ?? null;
}

export async function resolveTrickIdsForPath(
  trickNames: string[],
): Promise<Map<string, number>> {
  const snap = await loadCatalogueSnapshot();
  const pool = [...(snap?.tricks ?? []), ...(snap?.popular ?? [])];
  const map = new Map<string, number>();
  for (const name of trickNames) {
    const id = findTrickIdByName(name, pool);
    if (id != null) map.set(name, id);
  }
  return map;
}
