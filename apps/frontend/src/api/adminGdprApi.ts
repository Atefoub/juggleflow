import { api } from './authApi';

/**
 * Statut effectif d'un consentement, calcule cote serveur :
 *  - VALID   : actif et a jour
 *  - EXPIRED : depasse expiresAt OU policy_version obsolete
 *  - REVOKED : explicitement revoque
 *  - MISSING : aucun enregistrement
 */
export type ConsentStatus = 'VALID' | 'EXPIRED' | 'REVOKED' | 'MISSING';

export interface ConsentStatusRow {
  userId: number;
  firstName: string;
  lastName: string;
  hasParentalConsent: boolean;
  consentDate: string | null;
  policyVersion: string | null;
  /** Statut calcule par GdprService.evaluateStatus. */
  status: ConsentStatus;
  /** ISO-8601, NULL si pas de terme. */
  expiresAt: string | null;
}

export type ParentalConsentPayload = {
  userId: number;
  consentGiven: boolean;
  policyVersion: string;
  /** Représentant légal enregistré en base (souvent l’admin qui saisit pour l’établissement). */
  legalGuardianId: number;
  /** Optionnel — si absent, le serveur applique la duree par defaut. */
  expiresAt?: string | null;
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
      expiresAt: payload.expiresAt ?? null,
    });
  },

  /** DELETE /api/admin/gdpr/consents/:userId/PARENTAL_MINOR — révoque (désactive l’élève si parental). */
  revokeParentalConsent: async (userId: number): Promise<void> => {
    await api.delete(`/admin/gdpr/consents/${userId}/PARENTAL_MINOR`);
  },

  /**
   * GET /api/admin/gdpr/classes/:id/consents/export.pdf
   * Retourne le PDF binaire du registre des consentements.
   */
  exportConsentRegisterPdf: async (classId: number): Promise<Blob> => {
    const res = await api.get<Blob>(
      `/admin/gdpr/classes/${classId}/consents/export.pdf`,
      { responseType: 'blob' as never }
    );
    return res.data;
  },
};

