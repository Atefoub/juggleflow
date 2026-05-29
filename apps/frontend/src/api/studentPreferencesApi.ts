import { api } from './authApi';

export interface StudentPreferences {
  practiceRemindersEnabled: boolean;
  /** Absent si le backend n’est pas à jour — ne pas forcer le sombre dans ce cas. */
  darkModeEnabled?: boolean;
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
