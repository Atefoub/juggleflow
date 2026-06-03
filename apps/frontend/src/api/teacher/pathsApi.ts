import { api } from '../authApi';
import type {
  AssignPathRequest,
  ClassStudentPathOverview,
  LearningPathSummary,
  StudentPathAssignment,
  StudentPathProgress,
} from './types';

export const pathsApi = {
  getStudentProgress: async (classId: number, pathId: number): Promise<StudentPathProgress[]> => {
    const res = await api.get<StudentPathProgress[]>(
      `/enseignant/classes/${classId}/paths/${pathId}/progress`,
    );
    return res.data;
  },

  getStudentProgressForStudent: async (
    classId: number,
    pathId: number,
    studentId: number,
  ): Promise<StudentPathProgress> => {
    const res = await api.get<StudentPathProgress>(
      `/enseignant/classes/${classId}/paths/${pathId}/students/${studentId}`,
    );
    return res.data;
  },

  downloadPathProgressCsv: async (classId: number, pathId: number): Promise<Blob> => {
    const res = await api.get(
      `/enseignant/classes/${classId}/paths/${pathId}/progress/export`,
      { responseType: 'blob' },
    );
    return res.data as Blob;
  },

  getAllPaths: async (level?: string): Promise<LearningPathSummary[]> => {
    const res = await api.get<LearningPathSummary[]>('/learning-paths', {
      params: level ? { level } : undefined,
    });
    return res.data;
  },

  getAssignedPathsForClass: async (classId: number): Promise<LearningPathSummary[]> => {
    const res = await api.get<LearningPathSummary[]>(`/enseignant/classes/${classId}/paths`);
    return res.data;
  },

  getPathById: async (id: number): Promise<LearningPathSummary> => {
    const res = await api.get<LearningPathSummary>(`/learning-paths/${id}`);
    return res.data;
  },

  getAssignedPathsForStudent: async (
    classId: number,
    studentId: number,
  ): Promise<LearningPathSummary[]> => {
    const res = await api.get<LearningPathSummary[]>(
      `/enseignant/classes/${classId}/students/${studentId}/paths`,
    );
    return res.data;
  },

  getEffectiveAssignmentForStudent: async (
    classId: number,
    studentId: number,
  ): Promise<StudentPathAssignment | null> => {
    const res = await api.get<StudentPathAssignment>(
      `/enseignant/classes/${classId}/students/${studentId}/paths/effective`,
      { validateStatus: (status) => status === 200 || status === 204 },
    );
    return res.status === 204 ? null : res.data;
  },

  assignPathToStudent: async (
    classId: number,
    studentId: number,
    pathId: number,
  ): Promise<LearningPathSummary> => {
    const startDate = new Date().toISOString().slice(0, 10);
    const res = await api.post<LearningPathSummary>(
      `/enseignant/classes/${classId}/students/${studentId}/paths`,
      { studentId, learningPathId: pathId, startDate },
    );
    return res.data;
  },

  unassignPathFromStudent: async (
    classId: number,
    studentId: number,
    pathId: number,
  ): Promise<void> => {
    await api.delete(
      `/enseignant/classes/${classId}/students/${studentId}/paths/${pathId}`,
    );
  },

  getClassPathOverview: async (classId: number): Promise<ClassStudentPathOverview[]> => {
    const res = await api.get<ClassStudentPathOverview[]>(
      `/enseignant/classes/${classId}/paths/overview`,
    );
    return res.data;
  },

  assignPathToClass: async (classId: number, pathId: number): Promise<LearningPathSummary> => {
    const payload: AssignPathRequest = {
      classId,
      learningPathId: pathId,
      startDate: new Date().toISOString().slice(0, 10),
    };
    const res = await api.post<LearningPathSummary>(
      `/enseignant/classes/${classId}/paths`,
      payload,
    );
    return res.data;
  },

  unassignPathFromClass: async (classId: number, pathId: number): Promise<void> => {
    await api.delete(`/enseignant/classes/${classId}/paths/${pathId}`);
  },
};
