import { useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../../api/teacher/classesApi';
import { pathsApi } from '../../api/teacher/pathsApi';
import { teacherQueryKeys } from '../../api/teacher/queryKeys';
import type { ClassStudentPathOverview } from '../../api/teacher/types';
import { pathOverviewByStudentId } from '../../utils/pathOverview';

export const TEACHER_CLASS_LOAD_ERROR =
  'Impossible de charger les données de cette classe.';

export type TeacherClassBundle = {
  students: Awaited<ReturnType<typeof classesApi.getClassStudents>>;
  assignedPaths: Awaited<ReturnType<typeof pathsApi.getAssignedPathsForClass>>;
  pathOverview: Map<number, ClassStudentPathOverview>;
};

async function fetchClassBundle(classId: number): Promise<TeacherClassBundle> {
  const [students, assignedPaths, overview] = await Promise.all([
    classesApi.getClassStudents(classId),
    pathsApi.getAssignedPathsForClass(classId),
    pathsApi.getClassPathOverview(classId),
  ]);
  return {
    students,
    assignedPaths,
    pathOverview: pathOverviewByStudentId(overview),
  };
}

export function useTeacherClassDataQuery(classId: number | null) {
  const enabled = classId != null && Number.isFinite(classId);

  const query = useQuery({
    queryKey: teacherQueryKeys.classBundle(classId ?? 0),
    queryFn: () => fetchClassBundle(classId as number),
    enabled,
    staleTime: 30_000,
  });

  return {
    students: query.data?.students ?? [],
    assignedPaths: query.data?.assignedPaths ?? [],
    pathOverview: query.data?.pathOverview ?? new Map<number, ClassStudentPathOverview>(),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    /** Alias pour les pages existantes */
    loading: query.isLoading || query.isFetching,
    error: query.isError ? TEACHER_CLASS_LOAD_ERROR : null,
    refetch: query.refetch,
    reload: () => query.refetch(),
  };
}

/** Invalide le cache d'une classe après mutation (assignation, groupe, etc.). */
export function useInvalidateTeacherClass() {
  const queryClient = useQueryClient();
  return (classId: number) =>
    queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classBundle(classId) });
}
