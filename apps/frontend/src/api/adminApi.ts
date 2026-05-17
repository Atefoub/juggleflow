import { api } from './authApi';

export interface AdminSchoolClass {
  id: number;
  name: string;
  schoolLevel: string;
  schoolYear: number;
  studentCount: number;
  homeroomTeacherName: string | null;
  homeroomTeacherId: number | null;
}

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  enabled: boolean;
  classId: number | null;
  className: string | null;
  /**
   * - 'ok'      : consentement parental accordé et à jour
   * - 'expired' : consentement enregistré mais expiré (date ou policy version)
   * - 'missing' : consentement absent ou révoqué
   * - 'none'    : non applicable (enseignant / admin)
   */
  parentalConsentStatus: 'ok' | 'expired' | 'missing' | 'none';
}

export interface AdminCreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: 'ROLE_ELEVE' | 'ROLE_ENSEIGNANT' | 'ROLE_ADMINISTRATEUR';
  /** Optionnel : si omis, le serveur génère un mot de passe et le renvoie. */
  password?: string;
  classId?: number;
  schoolLevel?: string;
  /** ISO-8601 (YYYY-MM-DD), élève uniquement. */
  birthDate?: string;
}

export interface AdminCreateUserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  enabled: boolean;
  classId: number | null;
  className: string | null;
  /**
   * Présent UNE SEULE FOIS quand le serveur a généré le mot de passe.
   * À afficher à l'admin pour transmission, jamais persisté côté client.
   */
  generatedPassword: string | null;
}

export interface AdminCreateClassPayload {
  name: string;
  schoolLevel: string;
  schoolYear: number;
  homeroomTeacherId: number;
}

export interface AdminUpdateClassPayload {
  name?: string;
  schoolLevel?: string;
  schoolYear?: number;
  homeroomTeacherId?: number;
}

export type AdminClassStudentGroupColor = 'VERT' | 'ORANGE' | 'ROUGE';

export interface AdminEstablishmentStats {
  classCount: number;
  studentCount: number;
  teacherAccountCount: number;
  administratorAccountCount: number;
  activeUserCount: number;
  licenseSeatCap: number | null;
  licenseUsedCount: number;
  licenseExpiresAt: string | null;
}

export interface AdminAuditEvent {
  id: number;
  occurredAt: string;
  actorEmail: string;
  action: string;
  details: string | null;
}

export interface AdminClassStudent {
  id: number;
  firstName: string;
  lastName: string;
  progressionPercent: number;
  lastActivityAt: string | null;
  groupColor: AdminClassStudentGroupColor;
}

export const adminApi = {
  getClasses: async (): Promise<AdminSchoolClass[]> => {
    const res = await api.get<AdminSchoolClass[]>('/admin/classes');
    return res.data;
  },

  getUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<AdminUser[]>('/admin/users');
    return res.data;
  },

  exportProgressCsv: async (schoolYear?: number): Promise<string> => {
    const res = await api.get<string>('/admin/progress/export', {
      params: schoolYear ? { schoolYear } : undefined,
      responseType: 'text' as never,
    });
    return res.data;
  },

  /** Active ou désactive un compte (PATCH /api/admin/users/:id/enabled). */
  setUserEnabled: async (userId: number, enabled: boolean): Promise<void> => {
    await api.patch(`/admin/users/${userId}/enabled`, { enabled });
  },

  createClass: async (payload: AdminCreateClassPayload): Promise<AdminSchoolClass> => {
    const res = await api.post<AdminSchoolClass>('/admin/classes', payload);
    return res.data;
  },

  updateClass: async (classId: number, payload: AdminUpdateClassPayload): Promise<AdminSchoolClass> => {
    const res = await api.patch<AdminSchoolClass>(`/admin/classes/${classId}`, payload);
    return res.data;
  },

  getClassStudents: async (classId: number): Promise<AdminClassStudent[]> => {
    const res = await api.get<AdminClassStudent[]>(`/admin/classes/${classId}/students`);
    return res.data;
  },

  deleteClass: async (classId: number): Promise<void> => {
    await api.delete(`/admin/classes/${classId}`);
  },

  getEstablishmentStats: async (): Promise<AdminEstablishmentStats> => {
    const res = await api.get<AdminEstablishmentStats>('/admin/stats');
    return res.data;
  },

  listAuditEvents: async (limit = 100): Promise<AdminAuditEvent[]> => {
    const res = await api.get<AdminAuditEvent[]>('/admin/audit-events', {
      params: { limit },
    });
    return res.data;
  },

  /**
   * POST /api/admin/users
   * Crée un compte utilisateur (élève / enseignant / administrateur).
   * Si le mot de passe n'est pas fourni, le serveur en génère un et le
   * renvoie dans la réponse (à afficher une seule fois à l'admin).
   */
  createUser: async (payload: AdminCreateUserPayload): Promise<AdminCreateUserResponse> => {
    const res = await api.post<AdminCreateUserResponse>('/admin/users', payload);
    return res.data;
  },
};

