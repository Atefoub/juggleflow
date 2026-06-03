import { useQuery } from '@tanstack/react-query';
import { classesApi } from '../../api/teacher/classesApi';
import { teacherQueryKeys } from '../../api/teacher/queryKeys';

const CLASSES_ERROR = 'Impossible de charger vos classes.';

export function useTeacherClassesQuery() {
  const query = useQuery({
    queryKey: teacherQueryKeys.classes(),
    queryFn: () => classesApi.getMyClasses(),
    staleTime: 60_000,
  });

  return {
    classes: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? CLASSES_ERROR : null,
    refetch: query.refetch,
  };
}
