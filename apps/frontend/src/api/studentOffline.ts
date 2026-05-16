import {
  studentApi,
  type LearningPath,
  type StudentStats,
  type TrickProgress,
} from './studentApi';
import { loadStudentSnapshot, saveStudentSnapshot } from '../utils/offlineStudentStore';

function offlineError(code: string): Error {
  return new Error(code);
}

export async function getStudentStatistics(
  isOnline: boolean,
  userId: number | string,
): Promise<StudentStats> {
  if (isOnline) {
    const stats = await studentApi.getStatistics();
    await saveStudentSnapshot(userId, { stats });
    return stats;
  }
  const snap = await loadStudentSnapshot(userId);
  if (!snap?.stats) throw offlineError('OFFLINE_STUDENT_EMPTY');
  return snap.stats;
}

export async function getStudentLearningPaths(
  isOnline: boolean,
  userId: number | string,
): Promise<LearningPath[]> {
  if (isOnline) {
    const paths = await studentApi.getMyLearningPaths();
    await saveStudentSnapshot(userId, { paths });
    return paths;
  }
  const snap = await loadStudentSnapshot(userId);
  return snap?.paths ?? [];
}

export async function getStudentProgress(
  isOnline: boolean,
  userId: number | string,
): Promise<TrickProgress[]> {
  if (isOnline) {
    const progress = await studentApi.getMyProgress();
    await saveStudentSnapshot(userId, { progress });
    return progress;
  }
  const snap = await loadStudentSnapshot(userId);
  return snap?.progress ?? [];
}
