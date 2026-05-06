import { api } from './authApi';

export interface ConsentStatusRow {
  userId: number;
  firstName: string;
  lastName: string;
  hasParentalConsent: boolean;
  consentDate: string | null;
  policyVersion: string | null;
}

export const adminGdprApi = {
  getClassConsentStatus: async (classId: number): Promise<ConsentStatusRow[]> => {
    const res = await api.get<ConsentStatusRow[]>(
      `/admin/gdpr/classes/${classId}/consents`
    );
    return res.data;
  },

  getPendingCount: async (classId: number): Promise<number> => {
    const res = await api.get<{ pendingCount: number }>(
      `/admin/gdpr/classes/${classId}/consents/pending`
    );
    return res.data.pendingCount;
  },

  exportConsentRegister: async (classId: number): Promise<ConsentStatusRow[]> => {
    const res = await api.get<ConsentStatusRow[]>(
      `/admin/gdpr/classes/${classId}/consents/export`
    );
    return res.data;
  },
};

