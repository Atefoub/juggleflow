import { api } from '../authApi';
import type {
  StudentClassContext,
  StudentLookup,
  StudentSummary,
  StudentGroupColor,
} from './types';

/** Opérations élève hors parcours (recherche, groupe pédagogique). */
export const studentsApi = {
  getStudentClassContext: async (studentId: number): Promise<StudentClassContext> => {
    const res = await api.get<StudentClassContext>(
      `/enseignant/students/${studentId}/context`,
    );
    return res.data;
  },

  lookupStudent: async (email: string, classId: number): Promise<StudentLookup> => {
    const res = await api.get<StudentLookup>('/enseignant/students/lookup', {
      params: { email: email.trim(), classId: String(classId) },
    });
    return res.data;
  },

  updateStudentGroup: async (
    classId: number,
    studentId: number,
    groupColor: StudentGroupColor | null,
  ): Promise<StudentSummary> => {
    const res = await api.patch<StudentSummary>(
      `/enseignant/classes/${classId}/students/${studentId}/group`,
      { groupColor },
    );
    return res.data;
  },
};
