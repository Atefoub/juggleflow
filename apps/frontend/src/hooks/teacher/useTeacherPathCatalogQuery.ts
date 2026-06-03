import { useQuery } from '@tanstack/react-query';
import { pathsApi } from '../../api/teacher/pathsApi';
import { teacherQueryKeys } from '../../api/teacher/queryKeys';

const CATALOG_ERROR = 'Impossible de charger les parcours.';

export function useTeacherPathCatalogQuery(level?: string) {
  const query = useQuery({
    queryKey: teacherQueryKeys.pathCatalog(level),
    queryFn: () => pathsApi.getAllPaths(level === 'Tous' ? undefined : level),
    staleTime: 120_000,
  });

  return {
    paths: query.data ?? [],
    isLoading: query.isLoading,
    error: query.isError ? CATALOG_ERROR : null,
    refetch: query.refetch,
  };
}
