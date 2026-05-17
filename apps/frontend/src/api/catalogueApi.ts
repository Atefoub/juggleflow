import { api } from './authApi';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface TrickResponse {
  id: number;
  name: string;
  siteswap: string | null;
  description: string;
  jugglingLabAnimationUrl: string | null;
  difficultyScore: number;
  estimatedLearningDuration: number | null;
  popular: boolean;
  levelName: DifficultyLevel | null;
  categoryName: string | null;
  prerequisiteNames: string[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const catalogueApi = {
  /**
   * GET /api/tricks — liste paginée avec filtres optionnels
   */
  getTricks: async (params: {
    level?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<Page<TrickResponse>> => {
    const res = await api.get<Page<TrickResponse>>('/tricks', { params });
    return res.data;
  },

  /**
   * GET /api/tricks/popular — figures populaires
   */
  getPopular: async (): Promise<TrickResponse[]> => {
    const res = await api.get<TrickResponse[]>('/tricks/popular');
    return res.data;
  },

  /**
   * GET /api/tricks/recommended — figures recommandées pour un niveau
   */
  getRecommended: async (level: string): Promise<TrickResponse[]> => {
    const res = await api.get<TrickResponse[]>('/tricks/recommended', {
      params: { level },
    });
    return res.data;
  },

  /**
   * GET /api/tricks/:id — détail d'une figure
   */
  getTrickById: async (id: number): Promise<TrickResponse> => {
    const res = await api.get<TrickResponse>(`/tricks/${id}`);
    return res.data;
  },
};


export const LEVEL_LABELS: Record<string, string> = {
  Beginner:     'Débutant',
  Intermediate: 'Intermédiaire',
  Advanced:     'Avancé',
  Expert:       'Expert',
};

export const LEVEL_COLORS: Record<string, string> = {
  Beginner:     '#22C55E',
  Intermediate: '#FF7A00',
  Advanced:     '#8B2BE2',
  Expert:       '#FF4D4D',
};

export const LEVEL_BG: Record<string, string> = {
  Beginner:     'rgba(34,197,94,0.12)',
  Intermediate: 'rgba(255,122,0,0.12)',
  Advanced:     'rgba(139,43,226,0.12)',
  Expert:       'rgba(255,77,77,0.12)',
};

/** Transforme le difficultyScore (1–10) en étoiles affichées */
export function scoreToStars(score: number): number {
  return Math.round((score / 10) * 5);
}
