export interface SchoolClass {
  id: number;
  name: string;
  schoolLevel: string;
  schoolYear: number;
  studentCount: number;
  homeroomTeacherName: string | null;
}

export type StudentGroupColor = 'VERT' | 'ORANGE' | 'ROUGE';

export interface StudentClassContext {
  classId: number;
  className: string;
  student: StudentSummary;
}

export interface StudentLookup {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  currentClassId: number | null;
  currentClassName: string | null;
  alreadyInClass: boolean;
}

export interface TeacherCreateStudentRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface TeacherCreateStudentResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  classId: number;
  className: string | null;
  generatedPassword: string;
}

export interface StudentSummary {
  id: number;
  firstName: string;
  lastName: string;
  progressionPercent: number;
  lastActivityAt: string | null;
  groupColor: StudentGroupColor;
  groupColorAuto: StudentGroupColor;
  groupColorManual: boolean;
  blocked: boolean;
  blockedTrickId: number | null;
  blockedTrickName: string | null;
  blockedAttemptCount: number | null;
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
    attemptCount: number;
    masteryPercentage: number | null;
    blocked: boolean;
  }>;
}

export interface StudentPathAssignment {
  studentId: number;
  learningPathId: number;
  pathName: string;
  startDate: string;
  expectedEndDate: string | null;
  assignmentSource: 'CLASS' | 'STUDENT';
}

export interface ClassStudentPathOverview {
  studentId: number;
  firstName: string;
  lastName: string;
  learningPathId?: number;
  pathName?: string;
  completionPercent: number;
  assignmentSource?: 'CLASS' | 'STUDENT';
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
  startDate: string;
  expectedEndDate?: string;
}

export const GROUP_COLOR_MAP: Record<StudentSummary['groupColor'], string> = {
  VERT: '#22C55E',
  ORANGE: '#FF7A00',
  ROUGE: '#FF4D4D',
};

export const GROUP_LABEL_MAP: Record<StudentSummary['groupColor'], string> = {
  VERT: 'En avance',
  ORANGE: 'Progression normale',
  ROUGE: 'Nécessite attention',
};
