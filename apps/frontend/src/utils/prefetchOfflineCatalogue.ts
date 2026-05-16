import { catalogueApi } from '../api/catalogueApi';

const PAGE_SIZE = 20;
const MAX_LIST_PAGES = 8;
const MAX_TRICK_DETAILS = 20;

export type OfflinePrefetchResult = {
  listPages: number;
  trickDetails: number;
};

/**
 * Déclenche des GET catalogue pour alimenter le cache Workbox (NetworkFirst).
 * À appeler avec le mode hors-ligne activé, une fois en ligne.
 */
export async function prefetchOfflineCatalogue(): Promise<OfflinePrefetchResult> {
  const listTasks = Array.from({ length: MAX_LIST_PAGES }, (_, page) =>
    catalogueApi.getTricks({ page, size: PAGE_SIZE }).catch(() => null),
  );

  const [popular, ...listResults] = await Promise.all([
    catalogueApi.getPopular().catch(() => null),
    ...listTasks,
  ]);

  const popularList = Array.isArray(popular) ? popular : [];
  const detailIds = [...new Set(popularList.map((t) => t.id))].slice(0, MAX_TRICK_DETAILS);

  const detailResults = await Promise.all(
    detailIds.map((id) => catalogueApi.getTrickById(id).catch(() => null)),
  );

  return {
    listPages: listResults.filter(Boolean).length,
    trickDetails: detailResults.filter(Boolean).length,
  };
}
