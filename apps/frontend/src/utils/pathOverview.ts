import type { ClassStudentPathOverview } from '../api/teacherApi';

export function pathOverviewByStudentId(
  overview: ClassStudentPathOverview[],
): Map<number, ClassStudentPathOverview> {
  return new Map(overview.map((row) => [row.studentId, row]));
}

export function pathAssignmentSourceLabel(
  source?: ClassStudentPathOverview['assignmentSource'],
): string | null {
  if (source === 'STUDENT') return 'Individuel';
  if (source === 'CLASS') return 'Classe';
  return null;
}
