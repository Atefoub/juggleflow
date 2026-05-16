import type { TrickResponse } from '../api/catalogueApi';
import { idbGet, idbSet } from './idb';

const STORE = 'catalogue';
const SNAPSHOT_KEY = 'snapshot:v1';

export type CatalogueSnapshot = {
  savedAt: string;
  popular: TrickResponse[];
  tricks: TrickResponse[];
};

export async function loadCatalogueSnapshot(): Promise<CatalogueSnapshot | null> {
  try {
    return (await idbGet<CatalogueSnapshot>(STORE, SNAPSHOT_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveCatalogueSnapshot(partial: {
  popular?: TrickResponse[];
  tricks?: TrickResponse[];
}): Promise<CatalogueSnapshot> {
  const existing = (await loadCatalogueSnapshot()) ?? {
    savedAt: new Date().toISOString(),
    popular: [],
    tricks: [],
  };

  const byId = new Map<number, TrickResponse>();
  for (const t of existing.tricks) byId.set(t.id, t);
  for (const t of partial.tricks ?? []) byId.set(t.id, t);

  const next: CatalogueSnapshot = {
    savedAt: new Date().toISOString(),
    popular: partial.popular ?? existing.popular,
    tricks: [...byId.values()],
  };

  await idbSet(STORE, SNAPSHOT_KEY, next);
  return next;
}

export function filterTricks(
  tricks: TrickResponse[],
  params: { level?: string; search?: string },
): TrickResponse[] {
  const q = params.search?.trim().toLowerCase();
  return tricks.filter((t) => {
    if (params.level && t.levelName !== params.level) return false;
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false) ||
      (t.siteswap?.toLowerCase().includes(q) ?? false)
    );
  });
}

export function paginateTricks<T>(items: T[], page: number, size: number) {
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const number = Math.min(page, totalPages - 1);
  const start = number * size;
  return {
    content: items.slice(start, start + size),
    totalElements,
    totalPages,
    number,
    size,
  };
}

export async function getOfflineTrickById(id: number): Promise<TrickResponse | null> {
  const snap = await loadCatalogueSnapshot();
  if (!snap) return null;
  return snap.tricks.find((t) => t.id === id) ?? snap.popular.find((t) => t.id === id) ?? null;
}
