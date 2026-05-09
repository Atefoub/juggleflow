import { api } from './authApi';

export interface ConsentStatusRow {
  userId: number;
  firstName: string;
  lastName: string;
  hasParentalConsent: boolean;
  consentDate: string | null;
  policyVersion: string | null;
}

export type ParentalConsentPayload = {
  userId: number;
  consentGiven: boolean;
  policyVersion: string;
  /** Représentant légal enregistré en base (souvent l’admin qui saisit pour l’établissement). */
  legalGuardianId: number;
};

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

  /** POST /api/admin/gdpr/consents — enregistre un consentement (ex. parental). */
  recordConsent: async (payload: ParentalConsentPayload): Promise<void> => {
    await api.post('/admin/gdpr/consents', {
      userId: payload.userId,
      consentType: 'PARENTAL_MINOR',
      consentGiven: payload.consentGiven,
      policyVersion: payload.policyVersion,
      legalGuardianId: payload.legalGuardianId,
    });
  },

  /** DELETE /api/admin/gdpr/consents/:userId/PARENTAL_MINOR — révoque (désactive l’élève si parental). */
  revokeParentalConsent: async (userId: number): Promise<void> => {
    await api.delete(`/admin/gdpr/consents/${userId}/PARENTAL_MINOR`);
  },
};

