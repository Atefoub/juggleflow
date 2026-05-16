import type {
  BadgeData,
  DailyChallenge,
  LearningPath,
  StudentStats,
  TrickProgress,
} from '../api/studentApi';
import { idbDelete, idbGet, idbSet } from './idb';

const STORE = 'student';

function snapshotKey(userId: number | string): string {
  return `snapshot:v2:${userId}`;
}

export type StudentSnapshot = {
  savedAt: string;
  stats: StudentStats | null;
  paths: LearningPath[];
  progress: TrickProgress[];
  badgesUnlocked: BadgeData[];
  badgesAll: BadgeData[];
  dailyChallenge: DailyChallenge | null;
};

export async function loadStudentSnapshot(
  userId: number | string,
): Promise<StudentSnapshot | null> {
  try {
    return (await idbGet<StudentSnapshot>(STORE, snapshotKey(userId))) ?? null;
  } catch {
    return null;
  }
}

export async function saveStudentSnapshot(
  userId: number | string,
  partial: Partial<Omit<StudentSnapshot, 'savedAt'>>,
): Promise<StudentSnapshot> {
  const existing = (await loadStudentSnapshot(userId)) ?? {
    savedAt: new Date().toISOString(),
    stats: null,
    paths: [],
    progress: [],
    badgesUnlocked: [],
    badgesAll: [],
    dailyChallenge: null,
  };

  const next: StudentSnapshot = {
    savedAt: new Date().toISOString(),
    stats: partial.stats !== undefined ? partial.stats : existing.stats,
    paths: partial.paths ?? existing.paths,
    progress: partial.progress ?? existing.progress,
    badgesUnlocked: partial.badgesUnlocked ?? existing.badgesUnlocked,
    badgesAll: partial.badgesAll ?? existing.badgesAll,
    dailyChallenge: partial.dailyChallenge !== undefined ? partial.dailyChallenge : existing.dailyChallenge,
  };

  await idbSet(STORE, snapshotKey(userId), next);
  return next;
}

export async function clearStudentSnapshot(userId: number | string): Promise<void> {
  try {
    await idbDelete(STORE, snapshotKey(userId));
  } catch {
    // ignore
  }
}
