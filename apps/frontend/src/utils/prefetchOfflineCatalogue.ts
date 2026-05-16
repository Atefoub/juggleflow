import { catalogueApi } from '../api/catalogueApi';
import { saveCatalogueSnapshot } from './offlineCatalogueStore';

const PAGE_SIZE = 20;
const MAX_LIST_PAGES = 10;
const MAX_TRICK_DETAILS = 24;

export type OfflineCataloguePrefetchResult = {
  listPages: number;
  trickDetails: number;
  totalTricksStored: number;
};

export async function prefetchOfflineCatalogue(): Promise<OfflineCataloguePrefetchResult> {
  const listTasks = Array.from({ length: MAX_LIST_PAGES }, (_, page) =>
    catalogueApi.getTricks({ page, size: PAGE_SIZE }).catch(() => null),
  );

  const [popular, ...listResults] = await Promise.all([
    catalogueApi.getPopular().catch(() => null),
    ...listTasks,
  ]);

  const popularList = Array.isArray(popular) ? popular : [];
  const listTricks = listResults.flatMap((p) => (p?.content ? p.content : []));

  const detailIds = [...new Set(popularList.map((t) => t.id))].slice(0, MAX_TRICK_DETAILS);
  const detailResults = await Promise.all(
    detailIds.map((id) => catalogueApi.getTrickById(id).catch(() => null)),
  );
  const detailTricks = detailResults.filter((t): t is NonNullable<typeof t> => t != null);

  const snapshot = await saveCatalogueSnapshot({
    popular: popularList,
    tricks: [...listTricks, ...detailTricks],
  });

  return {
    listPages: listResults.filter(Boolean).length,
    trickDetails: detailTricks.length,
    totalTricksStored: snapshot.tricks.length,
  };
}
