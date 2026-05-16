import type { LearningPath } from '../api/studentApi';
import { resolveTrickIdsForPath } from './catalogueTrickLookup';

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

export async function computePathCompletionPercent(
  path: LearningPath,
  progressByTrickId: Record<number, ProgressStatus>,
): Promise<number> {
  if (path.stepCount <= 0) return 0;
  const idByName = await resolveTrickIdsForPath(path.trickNames);
  let mastered = 0;
  for (const name of path.trickNames) {
    const trickId = idByName.get(name);
    if (trickId != null && progressByTrickId[trickId] === 'MASTERED') {
      mastered += 1;
    }
  }
  return Math.round((mastered / path.stepCount) * 100);
}
