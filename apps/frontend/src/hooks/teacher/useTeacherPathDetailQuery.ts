import { useQuery } from '@tanstack/react-query';
import { pathsApi } from '../../api/teacher/pathsApi';
import { teacherQueryKeys } from '../../api/teacher/queryKeys';

export const TEACHER_PATH_DETAIL_ERROR =
  'Impossible de charger le parcours ou la progression.';

export function useTeacherPathDetailQuery(
  classId: number | null,
  pathId: number | null,
) {
  const enabled =
    classId != null &&
    pathId != null &&
    Number.isFinite(classId) &&
    Number.isFinite(pathId);

  const query = useQuery({
    queryKey: teacherQueryKeys.teacherPathDetail(classId ?? 0, pathId ?? 0),
    queryFn: async () => {
      const [path, progress] = await Promise.all([
        pathsApi.getPathById(pathId as number),
        pathsApi.getStudentProgress(classId as number, pathId as number),
      ]);
      return { path, progress };
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    path: query.data?.path ?? null,
    progress: query.data?.progress ?? [],
    isLoading: query.isLoading,
    loading: query.isLoading || query.isFetching,
    error: query.isError ? TEACHER_PATH_DETAIL_ERROR : null,
    refetch: query.refetch,
  };
}
