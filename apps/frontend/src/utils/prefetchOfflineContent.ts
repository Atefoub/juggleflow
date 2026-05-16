import { studentApi } from '../api/studentApi';
import { prefetchOfflineCatalogue, type OfflineCataloguePrefetchResult } from './prefetchOfflineCatalogue';
import { saveStudentSnapshot } from './offlineStudentStore';

export type OfflineContentPrefetchResult = OfflineCataloguePrefetchResult & {
  pathsCount: number;
  progressCount: number;
  badgesCount: number;
  hasStats: boolean;
};

/**
 * Précharge catalogue (IndexedDB) + données élève (IndexedDB par utilisateur).
 */
export async function prefetchOfflineContent(
  userId: number | string,
): Promise<OfflineContentPrefetchResult> {
  const [catalogue, stats, paths, progress, unlocked, all] = await Promise.all([
    prefetchOfflineCatalogue(),
    studentApi.getStatistics().catch(() => null),
    studentApi.getMyLearningPaths().catch(() => [] as Awaited<ReturnType<typeof studentApi.getMyLearningPaths>>),
    studentApi.getMyProgress().catch(() => [] as Awaited<ReturnType<typeof studentApi.getMyProgress>>),
    studentApi.getUnlockedBadges().catch(() => [] as Awaited<ReturnType<typeof studentApi.getUnlockedBadges>>),
    studentApi.getAllBadges().catch(() => [] as Awaited<ReturnType<typeof studentApi.getAllBadges>>),
  ]);

  await saveStudentSnapshot(userId, {
    stats,
    paths,
    progress,
    badgesUnlocked: unlocked,
    badgesAll: all,
  });

  return {
    ...catalogue,
    pathsCount: paths.length,
    progressCount: progress.length,
    badgesCount: unlocked.length,
    hasStats: stats != null,
  };
}
