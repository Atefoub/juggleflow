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
  parentalConsentStatus: 'ok' | 'missing' | 'none';
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
};

