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
  completionPercent: number;
  masteredCount: number;
  totalSteps: number;
  trickDetails: Array<{
    trickId: number;
    trickName: string;
    status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED' | string;
  }>;
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
  /** P2.8 - Sous-ensemble d'eleves. Omis = toute la classe ; tableau = assignation individuelle. */
  studentIds?: number[];
}

// ── P2.7 — Groupes pedagogiques editables ─────────────────────

export type StudentGroupColor =
  | 'VERT' | 'ORANGE' | 'ROUGE' | 'BLEU' | 'VIOLET' | 'JAUNE' | 'GRIS';

export interface StudentGroup {
  id: number;
  classId: number;
  name: string;
  color: StudentGroupColor;
  position: number;
  createdAt: string;
  updatedAt: string;
  memberIds: number[];
  memberCount: number;
}

export interface CreateStudentGroupPayload {
  name: string;
  color: StudentGroupColor;
}

export interface UpdateStudentGroupPayload {
  name?: string;
  color?: StudentGroupColor;
}

/** Palette utilisee a la fois pour les groupes nommes et l'affichage VERT/ORANGE/ROUGE. */
export const GROUP_PALETTE: Record<StudentGroupColor, { hex: string; label: string }> = {
  VERT:   { hex: '#22C55E', label: 'Vert'   },
  ORANGE: { hex: '#FF7A00', label: 'Orange' },
  ROUGE:  { hex: '#FF4D4D', label: 'Rouge'  },
  BLEU:   { hex: '#3B82F6', label: 'Bleu'   },
  VIOLET: { hex: '#A855F7', label: 'Violet' },
  JAUNE:  { hex: '#FACC15', label: 'Jaune'  },
  GRIS:   { hex: '#9CA3AF', label: 'Gris'   },
};

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

  getStudentProgressForStudent: async (
    classId: number,
    pathId: number,
    studentId: number
  ): Promise<StudentPathProgress> => {
    const res = await api.get<StudentPathProgress>(
      `/enseignant/classes/${classId}/paths/${pathId}/students/${studentId}`
    );
    return res.data;
  },

  downloadPathProgressCsv: async (classId: number, pathId: number): Promise<Blob> => {
    const res = await api.get(
      `/enseignant/classes/${classId}/paths/${pathId}/progress/export`,
      { responseType: 'blob' }
    );
    return res.data as Blob;
  },

  getAllPaths: async (level?: string): Promise<LearningPathSummary[]> => {
    // Alignement backend: les parcours sont exposés sous /api/learning-paths
    const res = await api.get<LearningPathSummary[]>('/learning-paths', {
      params: level ? { level } : undefined,
    });
    return res.data;
  },

  /**
   * Parcours déjà assignés à une classe (vue enseignant).
   */
  getAssignedPathsForClass: async (classId: number): Promise<LearningPathSummary[]> => {
    const res = await api.get<LearningPathSummary[]>(`/enseignant/classes/${classId}/paths`);
    return res.data;
  },

  getPathById: async (id: number): Promise<LearningPathSummary> => {
    const res = await api.get<LearningPathSummary>(`/learning-paths/${id}`);
    return res.data;
  },

  /**
   * Assigne un parcours a une classe (toute la classe) ou a un sous-ensemble
   * d'eleves selon que `studentIds` est fourni ou non.
   * @param classId    classe cible
   * @param pathId     parcours a assigner
   * @param studentIds laisse undefined pour assigner a toute la classe, sinon
   *                   liste des eleves cibles (P2.8).
   */
  assignPathToClass: async (
    classId: number,
    pathId: number,
    studentIds?: number[],
  ): Promise<LearningPathSummary> => {
    const today = new Date();
    const startDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

    const payload: AssignPathRequest = {
      classId,
      learningPathId: pathId,
      startDate,
      ...(studentIds !== undefined ? { studentIds } : {}),
    };

    const res = await api.post<LearningPathSummary>(
      `/enseignant/classes/${classId}/paths`,
      payload
    );
    return res.data;
  },

  // ── P2.7 — Groupes pedagogiques ─────────────────────────────

  listGroups: async (classId: number): Promise<StudentGroup[]> => {
    const res = await api.get<StudentGroup[]>(`/enseignant/classes/${classId}/groups`);
    return res.data;
  },

  createGroup: async (classId: number, payload: CreateStudentGroupPayload): Promise<StudentGroup> => {
    const res = await api.post<StudentGroup>(`/enseignant/classes/${classId}/groups`, payload);
    return res.data;
  },

  updateGroup: async (
    classId: number, groupId: number, payload: UpdateStudentGroupPayload,
  ): Promise<StudentGroup> => {
    const res = await api.patch<StudentGroup>(
      `/enseignant/classes/${classId}/groups/${groupId}`,
      payload,
    );
    return res.data;
  },

  deleteGroup: async (classId: number, groupId: number): Promise<void> => {
    await api.delete(`/enseignant/classes/${classId}/groups/${groupId}`);
  },

  reorderGroups: async (classId: number, groupIds: number[]): Promise<StudentGroup[]> => {
    const res = await api.put<StudentGroup[]>(
      `/enseignant/classes/${classId}/groups/reorder`,
      { groupIds },
    );
    return res.data;
  },

  setGroupMembers: async (
    classId: number, groupId: number, studentIds: number[],
  ): Promise<StudentGroup> => {
    const res = await api.put<StudentGroup>(
      `/enseignant/classes/${classId}/groups/${groupId}/members`,
      { studentIds },
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
