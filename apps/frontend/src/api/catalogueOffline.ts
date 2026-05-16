import {
  catalogueApi,
  type Page,
  type TrickResponse,
} from './catalogueApi';
import {
  filterTricks,
  getOfflineTrickById,
  loadCatalogueSnapshot,
  paginateTricks,
  saveCatalogueSnapshot,
} from '../utils/offlineCatalogueStore';

type TricksQuery = {
  level?: string;
  search?: string;
  page?: number;
  size?: number;
};

export async function getPopularTricks(isOnline: boolean): Promise<TrickResponse[]> {
  if (isOnline) {
    const popular = await catalogueApi.getPopular();
    await saveCatalogueSnapshot({ popular });
    return popular;
  }
  const snap = await loadCatalogueSnapshot();
  return snap?.popular ?? [];
}

export async function getTricksPage(
  isOnline: boolean,
  params: TricksQuery,
): Promise<Page<TrickResponse>> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const level = params.level;
  const search = params.search;

  if (isOnline) {
    const data = await catalogueApi.getTricks({ level, search, page, size });
    if (!search) {
      await saveCatalogueSnapshot({ tricks: data.content });
    }
    return data;
  }

  const snap = await loadCatalogueSnapshot();
  if (!snap?.tricks.length) {
    throw new Error('OFFLINE_CATALOGUE_EMPTY');
  }

  const filtered = filterTricks(snap.tricks, { level, search });
  return paginateTricks(filtered, page, size);
}

export async function getTrickDetail(
  isOnline: boolean,
  id: number,
): Promise<TrickResponse> {
  if (isOnline) {
    const trick = await catalogueApi.getTrickById(id);
    await saveCatalogueSnapshot({ tricks: [trick] });
    return trick;
  }

  const offline = await getOfflineTrickById(id);
  if (offline) return offline;
  throw new Error('OFFLINE_TRICK_NOT_FOUND');
}
