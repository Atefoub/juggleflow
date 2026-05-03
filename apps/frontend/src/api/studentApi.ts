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
    const res = await api.get<LearningPath[]>('/tricks/paths');
    return res.data;
  },
};