import { api } from './authApi';

export interface SchoolClass {
  id: number;
  name: string;
  schoolLevel: string;
  schoolYear: number;
  studentCount: number;
  homeroomTeacherName: string | null;
}

export interface StudentSummary {
  id: number;
  firstName: string;
  lastName: string;
  progressionPercent: number;
  lastActivityAt: string | null;
  groupColor: 'VERT' | 'ORANGE' | 'ROUGE';
}

export interface StudentPathProgress {
  studentId: number;
  firstName: string;
  lastName: string;
  progressionPercent: number;
  tricksCompleted: number;
  totalTricks: number;
}

export interface LearningPathSummary {
  id: number;
  pathName: string;
  description: string;
  targetLevel: string | null;
  estimatedDurationDays: number | null;
  stepCount: number;
  trickNames: string[];
}

export interface AssignPathRequest {
  learningPathId: number;
  classId: number;
  startDate: string; // YYYY-MM-DD
  expectedEndDate?: string; // YYYY-MM-DD
}

export interface TrickProgressItem {
  trickId: number;
  trickName: string;
  status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
  masteryScore: number | null;
  updatedAt: string | null;
}

export const teacherApi = {
  getMyClasses: async (): Promise<SchoolClass[]> => {
    const res = await api.get<SchoolClass[]>('/enseignant/classes');
    return res.data;
  },

  getClassStudents: async (classId: number): Promise<StudentSummary[]> => {
    const res = await api.get<StudentSummary[]>(`/enseignant/classes/${classId}/students`);
    return res.data;
  },

  getStudentProgress: async (classId: number, pathId: number): Promise<StudentPathProgress[]> => {
    const res = await api.get<StudentPathProgress[]>(
      `/enseignant/classes/${classId}/paths/${pathId}/progress`
    );
    return res.data;
  },

  getAllPaths: async (level?: string): Promise<LearningPathSummary[]> => {
    // Alignement backend: les parcours sont exposés sous /api/learning-paths
    const res = await api.get<LearningPathSummary[]>('/learning-paths', {
      params: level ? { level } : undefined,
    });
    return res.data;
  },

  getPathById: async (id: number): Promise<LearningPathSummary> => {
    const res = await api.get<LearningPathSummary>(`/learning-paths/${id}`);
    return res.data;
  },

  assignPathToClass: async (classId: number, pathId: number): Promise<LearningPathSummary> => {
    const today = new Date();
    const startDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

    const payload: AssignPathRequest = {
      classId,
      learningPathId: pathId,
      startDate,
    };

    const res = await api.post<LearningPathSummary>(
      `/enseignant/classes/${classId}/paths`,
      payload
    );
    return res.data;
  },

  unassignPathFromClass: async (classId: number, pathId: number): Promise<void> => {
    await api.delete(`/enseignant/classes/${classId}/paths/${pathId}`);
  },

  addStudentToClass: async (classId: number, studentId: number): Promise<void> => {
    await api.post(`/enseignant/classes/${classId}/students/${studentId}`);
  },

  removeStudentFromClass: async (classId: number, studentId: number): Promise<void> => {
    await api.delete(`/enseignant/classes/${classId}/students/${studentId}`);
  },
};

// Helpers pour l'affichage des couleurs de groupe
export const GROUP_COLOR_MAP: Record<StudentSummary['groupColor'], string> = {
  VERT:   '#22C55E',
  ORANGE: '#FF7A00',
  ROUGE:  '#FF4D4D',
};

export const GROUP_LABEL_MAP: Record<StudentSummary['groupColor'], string> = {
  VERT:   'En avance',
  ORANGE: 'Progression normale',
  ROUGE:  'Nécessite attention',
};
