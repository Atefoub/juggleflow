export const teacherQueryKeys = {
  all: ['teacher'] as const,
  classes: () => [...teacherQueryKeys.all, 'classes'] as const,
  classBundle: (classId: number) =>
    [...teacherQueryKeys.all, 'classBundle', classId] as const,
  pathCatalog: (level?: string) =>
    [...teacherQueryKeys.all, 'pathCatalog', level ?? 'all'] as const,
  pathDetail: (pathId: number) =>
    [...teacherQueryKeys.all, 'pathDetail', pathId] as const,
  classProgress: (classId: number, pathId: number) =>
    [...teacherQueryKeys.all, 'classProgress', classId, pathId] as const,
  studentDetail: (studentId: number, classId: number | null) =>
    [...teacherQueryKeys.all, 'studentDetail', studentId, classId ?? 'discover'] as const,
  studentPathProgress: (classId: number, pathId: number, studentId: number) =>
    [...teacherQueryKeys.all, 'studentPathProgress', classId, pathId, studentId] as const,
  teacherPathDetail: (classId: number, pathId: number) =>
    [...teacherQueryKeys.all, 'teacherPathDetail', classId, pathId] as const,
};
