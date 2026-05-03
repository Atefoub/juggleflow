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