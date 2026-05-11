/**
 * Source unique des onglets BottomNav cote enseignant.
 * Importe par TeacherDashboardPage, StudentListPage, StudentDetailPage,
 * AssignPathPage, TeacherPathDetailPage, ResourcesTeacherPage et la nouvelle
 * TeacherGroupsPage (P2.7).
 */
export interface TeacherNavItem {
  label: string;
  icon: string;
  path: string;
}

export const TEACHER_NAV_ITEMS: readonly TeacherNavItem[] = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Groupes',        icon: '🧩', path: '/teacher/groupes' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours/assigner' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
] as const;
