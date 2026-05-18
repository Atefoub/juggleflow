import { api } from './authApi';

export interface StudentPreferences {
  practiceRemindersEnabled: boolean;
}

export const studentPreferencesApi = {
  get: async (): Promise<StudentPreferences> => {
    const { data } = await api.get<StudentPreferences>('/eleve/preferences');
    return data;
  },

  update: async (practiceRemindersEnabled: boolean): Promise<StudentPreferences> => {
    const { data } = await api.patch<StudentPreferences>('/eleve/preferences', {
      practiceRemindersEnabled,
    });
    return data;
  },
};
