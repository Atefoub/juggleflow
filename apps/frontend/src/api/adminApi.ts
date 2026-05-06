import { api } from './authApi';

export interface AdminSchoolClass {
  id: number;
  name: string;
  schoolLevel: string;
  schoolYear: number;
  studentCount: number;
  homeroomTeacherName: string | null;
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

export const adminApi = {
  getClasses: async (): Promise<AdminSchoolClass[]> => {
    const res = await api.get<AdminSchoolClass[]>('/admin/classes');
    return res.data;
  },

  getUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<AdminUser[]>('/admin/users');
    return res.data;
  },
};

