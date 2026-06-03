import { useQuery } from '@tanstack/react-query';
import { classesApi } from '../../api/teacher/classesApi';
import { pathsApi } from '../../api/teacher/pathsApi';
import { studentsApi } from '../../api/teacher/studentsApi';
import { teacherQueryKeys } from '../../api/teacher/queryKeys';
import type {
  LearningPathSummary,
  StudentPathAssignment,
  StudentSummary,
} from '../../api/teacher/types';

export const STUDENT_DETAIL_LOAD_ERROR =
  "Impossible de charger les données de l'élève.";
export const STUDENT_NOT_FOUND_ERROR = 'Élève introuvable.';

export type StudentDetailBundle = {
  student: StudentSummary;
  classId: number;
  assignedPaths: LearningPathSummary[];
  effectiveAssignment: StudentPathAssignment | null;
};

async function resolveStudentAndClass(
  studentId: number,
  classIdFromQuery: number | null,
): Promise<{ student: StudentSummary; classId: number }> {
  if (classIdFromQuery != null && Number.isFinite(classIdFromQuery)) {
    const list = await classesApi.getClassStudents(classIdFromQuery);
    const found = list.find((s) => s.id === studentId);
    if (!found) {
      throw new Error(STUDENT_NOT_FOUND_ERROR);
    }
    return { student: found, classId: classIdFromQuery };
  }

  const ctx = await studentsApi.getStudentClassContext(studentId);
  return { student: ctx.student, classId: ctx.classId };
}

async function fetchStudentDetailBundle(
  studentId: number,
  classIdFromQuery: number | null,
): Promise<StudentDetailBundle> {
  const { student, classId } = await resolveStudentAndClass(studentId, classIdFromQuery);

  const [assignedPaths, effectiveAssignment] = await Promise.all([
    pathsApi.getAssignedPathsForStudent(classId, studentId),
    pathsApi.getEffectiveAssignmentForStudent(classId, studentId),
  ]);

  return { student, classId, assignedPaths, effectiveAssignment };
}

export function useStudentDetailQuery(
  studentId: number | null,
  classIdFromQuery: number | null,
) {
  const enabled = studentId != null && Number.isFinite(studentId);

  const query = useQuery({
    queryKey: teacherQueryKeys.studentDetail(studentId ?? 0, classIdFromQuery),
    queryFn: () => fetchStudentDetailBundle(studentId as number, classIdFromQuery),
    enabled,
    staleTime: 30_000,
  });

  const notFound =
    query.isError &&
    query.error instanceof Error &&
    query.error.message === STUDENT_NOT_FOUND_ERROR;

  return {
    student: query.data?.student ?? null,
    classId: query.data?.classId ?? null,
    assignedPaths: query.data?.assignedPaths ?? [],
    effectiveAssignment: query.data?.effectiveAssignment ?? null,
    isLoading: query.isLoading,
    loading: query.isLoading || query.isFetching,
    error: query.isError
      ? notFound
        ? STUDENT_NOT_FOUND_ERROR
        : STUDENT_DETAIL_LOAD_ERROR
      : null,
    refetch: query.refetch,
  };
}
