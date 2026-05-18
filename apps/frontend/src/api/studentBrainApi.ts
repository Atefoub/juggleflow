import { api } from './authApi';

export interface BrainModuleProgress {
  started: boolean;
  completedChapters: number[];
}

export const studentBrainApi = {
  getProgress: async (): Promise<BrainModuleProgress> => {
    const { data } = await api.get<BrainModuleProgress>('/eleve/brain-module');
    return data;
  },

  completeChapter: async (chapterNumber: number): Promise<BrainModuleProgress> => {
    const { data } = await api.post<BrainModuleProgress>(
      `/eleve/brain-module/chapters/${chapterNumber}/complete`,
    );
    return data;
  },
};
