import type { StudentSummary } from '../api/teacherApi';

export const GROUP_ORDER = ['VERT', 'ORANGE', 'ROUGE'] as const;
export type GroupColor = (typeof GROUP_ORDER)[number];

export function groupStudentsByColor(
  students: StudentSummary[],
): Record<GroupColor, StudentSummary[]> {
  const groups: Record<GroupColor, StudentSummary[]> = {
    VERT: [],
    ORANGE: [],
    ROUGE: [],
  };
  for (const s of students) {
    groups[s.groupColor].push(s);
  }
  return groups;
}

export function averageGroupProgress(students: StudentSummary[]): number {
  if (students.length === 0) return 0;
  return Math.round(
    students.reduce((sum, s) => sum + s.progressionPercent, 0) / students.length,
  );
}

export function formatLastActivity(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfToday) return "Aujourd'hui";
  if (d >= startOfYesterday) return 'Hier';
  const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
