import { api } from './authApi';

export interface StudentStats {
  totalTricksLearned: number;
  tricksInProgress: number;
  badgesEarned: number;
  currentStreakDays: number;
  longestStreakDays: number;
  totalPracticeMinutes: number;
}

export interface DailyChallenge {
  id: number;
  rotationSlot: number;
  title: string;
  description: string;
  trickId: number | null;
  trickName: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  date: string;
}

export interface BadgeData {
  id: number;
  name: string;
  description: string;
  iconUrl: string | null;
  experiencePoints: number;
  badgeTypeName: string | null;
  unlockedAt: string | null;
  unlocked: boolean;
}

export interface LearningPath {
  id: number;
  pathName: string;
  description: string;
  targetLevel: string | null;
  estimatedDurationDays: number | null;
  stepCount: number;
  trickNames: string[];
}

export interface TrickProgress {
  trickId: number;
  trickName: string;
  status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
  masteryScore: number | null;
  updatedAt: string | null;
}

/**
 * DTO backend (ProgressResponse) :
 * - masteryPercentage: 0..100
 * - lastPractice: ISO string (Instant)
 */
interface ProgressResponseDto {
  trickId: number;
  trickName: string;
  status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
  masteryPercentage: number | null;
  lastPractice: string | null;
}

function toTrickProgress(dto: ProgressResponseDto): TrickProgress {
  return {
    trickId: dto.trickId,
    trickName: dto.trickName,
    status: dto.status,
    masteryScore: dto.masteryPercentage === null ? null : Math.round(dto.masteryPercentage / 10),
    updatedAt: dto.lastPractice,
  };
}

export const studentApi = {
  getStatistics: async (): Promise<StudentStats> => {
    const res = await api.get<StudentStats>('/progress/statistics');
    return res.data;
  },

  getUnlockedBadges: async (): Promise<BadgeData[]> => {
    const res = await api.get<BadgeData[]>('/badges/unlocked');
    return res.data;
  },

  getAllBadges: async (): Promise<BadgeData[]> => {
    const res = await api.get<BadgeData[]>('/badges');
    return res.data;
  },

  getMyLearningPaths: async (): Promise<LearningPath[]> => {
    // Parcours assignés à la classe de l'élève connecté
    const res = await api.get<LearningPath[]>('/eleve/learning-paths');
    return res.data;
  },

  getMyProgress: async (): Promise<TrickProgress[]> => {
    const res = await api.get<ProgressResponseDto[]>('/progress');
    return res.data.map(toTrickProgress);
  },

  updateProgress: async (trickId: number, data: {
    status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
    masteryScore?: number;
  }): Promise<TrickProgress> => {
    const payload = {
      status: data.status,
      masteryPercentage: data.masteryScore === undefined ? undefined : Math.max(0, Math.min(100, data.masteryScore * 10)),
    };

    const res = await api.put<ProgressResponseDto>(`/progress/${trickId}`, payload);
    return toTrickProgress(res.data);
  },

  /**
   * Défi du jour pour l'élève connecté.
   * Retourne null si aucun défi n'est configuré côté serveur (204 No Content).
   */
  getDailyChallenge: async (): Promise<DailyChallenge | null> => {
    const res = await api.get<DailyChallenge | ''>('/eleve/daily-challenge', {
      validateStatus: (s) => s === 200 || s === 204,
    });
    if (res.status === 204 || res.data === '' || res.data === null) return null;
    return res.data as DailyChallenge;
  },
};
