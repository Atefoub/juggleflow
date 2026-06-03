import { useCallback, useEffect, useState } from 'react';
import {
  teacherApi,
  type ClassStudentPathOverview,
  type LearningPathSummary,
  type StudentSummary,
} from '../api/teacherApi';
import { pathOverviewByStudentId } from '../utils/pathOverview';

export type TeacherClassDataState = {
  students: StudentSummary[];
  assignedPaths: LearningPathSummary[];
  pathOverview: Map<number, ClassStudentPathOverview>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const LOAD_ERROR = 'Impossible de charger les données de cette classe.';

/**
 * Charge élèves, parcours assignés et vue parcours/élève en parallèle (une vague HTTP).
 */
export function useTeacherClassData(classId: number | null): TeacherClassDataState {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [assignedPaths, setAssignedPaths] = useState<LearningPathSummary[]>([]);
  const [pathOverview, setPathOverview] = useState<Map<number, ClassStudentPathOverview>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (classId == null || !Number.isFinite(classId)) {
      setStudents([]);
      setAssignedPaths([]);
      setPathOverview(new Map());
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [studentList, paths, overview] = await Promise.all([
        teacherApi.getClassStudents(classId),
        teacherApi.getAssignedPathsForClass(classId),
        teacherApi.getClassPathOverview(classId),
      ]);
      setStudents(studentList);
      setAssignedPaths(paths);
      setPathOverview(pathOverviewByStudentId(overview));
    } catch {
      setStudents([]);
      setAssignedPaths([]);
      setPathOverview(new Map());
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { students, assignedPaths, pathOverview, loading, error, reload };
}
