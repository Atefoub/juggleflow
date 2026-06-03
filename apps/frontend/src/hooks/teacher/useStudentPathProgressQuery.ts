import { useQuery } from '@tanstack/react-query';
import { pathsApi } from '../../api/teacher/pathsApi';
import { teacherQueryKeys } from '../../api/teacher/queryKeys';

export function useStudentPathProgressQuery(
  classId: number | null,
  pathId: number | null,
  studentId: number | null,
) {
  const enabled =
    classId != null &&
    pathId != null &&
    studentId != null &&
    Number.isFinite(classId) &&
    Number.isFinite(pathId) &&
    Number.isFinite(studentId);

  return useQuery({
    queryKey: teacherQueryKeys.studentPathProgress(
      classId ?? 0,
      pathId ?? 0,
      studentId ?? 0,
    ),
    queryFn: () =>
      pathsApi.getStudentProgressForStudent(
        classId as number,
        pathId as number,
        studentId as number,
      ),
    enabled,
    staleTime: 20_000,
  });
}
