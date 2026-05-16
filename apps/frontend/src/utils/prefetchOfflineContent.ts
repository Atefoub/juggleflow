import { studentApi } from '../api/studentApi';
import { prefetchOfflineCatalogue, type OfflineCataloguePrefetchResult } from './prefetchOfflineCatalogue';
import { saveStudentSnapshot } from './offlineStudentStore';

export type OfflineContentPrefetchResult = OfflineCataloguePrefetchResult & {
  pathsCount: number;
  progressCount: number;
  hasStats: boolean;
};

/**
 * Précharge catalogue (IndexedDB) + données élève non exportables via cache SW partagé.
 */
export async function prefetchOfflineContent(
  userId: number | string,
): Promise<OfflineContentPrefetchResult> {
  const [catalogue, stats, paths, progress] = await Promise.all([
    prefetchOfflineCatalogue(),
    studentApi.getStatistics().catch(() => null),
    studentApi.getMyLearningPaths().catch(() => [] as Awaited<ReturnType<typeof studentApi.getMyLearningPaths>>),
    studentApi.getMyProgress().catch(() => [] as Awaited<ReturnType<typeof studentApi.getMyProgress>>),
  ]);

  await saveStudentSnapshot(userId, { stats, paths, progress });

  return {
    ...catalogue,
    pathsCount: paths.length,
    progressCount: progress.length,
    hasStats: stats != null,
  };
}
