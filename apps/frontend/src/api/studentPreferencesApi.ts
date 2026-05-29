import { api } from './authApi';

export interface StudentPreferences {
  practiceRemindersEnabled: boolean;
  darkModeEnabled: boolean;
}

export type StudentPreferencesPatch = Partial<StudentPreferences>;

export const studentPreferencesApi = {
  get: async (): Promise<StudentPreferences> => {
    const { data } = await api.get<StudentPreferences>('/eleve/preferences');
    return data;
  },

  update: async (patch: StudentPreferencesPatch): Promise<StudentPreferences> => {
    const { data } = await api.patch<StudentPreferences>('/eleve/preferences', patch);
    return data;
  },
};
