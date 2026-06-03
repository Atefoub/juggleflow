import { api } from '../authApi';
import type {
  SchoolClass,
  StudentSummary,
  TeacherCreateStudentRequest,
  TeacherCreateStudentResponse,
} from './types';

export const classesApi = {
  getMyClasses: async (): Promise<SchoolClass[]> => {
    const res = await api.get<SchoolClass[]>('/enseignant/classes');
    return res.data;
  },

  getClassStudents: async (classId: number): Promise<StudentSummary[]> => {
    const res = await api.get<StudentSummary[]>(`/enseignant/classes/${classId}/students`);
    return res.data;
  },

  createStudentInClass: async (
    classId: number,
    body: TeacherCreateStudentRequest,
  ): Promise<TeacherCreateStudentResponse> => {
    const res = await api.post<TeacherCreateStudentResponse>(
      `/enseignant/classes/${classId}/students`,
      body,
    );
    return res.data;
  },

  addStudentToClass: async (classId: number, studentId: number): Promise<void> => {
    await api.post(`/enseignant/classes/${classId}/students/${studentId}`);
  },

  removeStudentFromClass: async (classId: number, studentId: number): Promise<void> => {
    await api.delete(`/enseignant/classes/${classId}/students/${studentId}`);
  },
};
