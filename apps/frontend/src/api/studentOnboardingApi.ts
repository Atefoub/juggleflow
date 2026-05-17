import { api } from './authApi';
import type { UserProfile } from '../types/auth';
import type { OnboardingLevel } from '../utils/onboarding';

export const studentOnboardingApi = {
  complete: async (level: OnboardingLevel): Promise<UserProfile> => {
    const { data } = await api.post<UserProfile>('/eleve/onboarding', { level });
    return data;
  },

  updateLevel: async (level: OnboardingLevel): Promise<UserProfile> => {
    const { data } = await api.patch<UserProfile>('/eleve/onboarding', { level });
    return data;
  },
};
