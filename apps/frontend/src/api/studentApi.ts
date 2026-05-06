import { api } from './authApi';

export interface StudentStats {
  totalTricksLearned: number;
  tricksInProgress: number;
  badgesEarned: number;
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
    // Alignement backend: les parcours sont exposés sous /api/learning-paths
    const res = await api.get<LearningPath[]>('/learning-paths');
    return res.data;
  },

  getMyProgress: async (): Promise<TrickProgress[]> => {
    const res = await api.get<TrickProgress[]>('/progress');
    return res.data;
  },

  updateProgress: async (trickId: number, data: {
    status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
    masteryScore?: number;
  }): Promise<TrickProgress> => {
    const res = await api.put<TrickProgress>(`/progress/${trickId}`, data);
    return res.data;
  },
};
