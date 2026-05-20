export interface TeacherNavItem {
  label: string;
  icon: string;
  path: string;
}

export const TEACHER_NAV_ITEMS: readonly TeacherNavItem[] = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves', icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours', icon: '📚', path: '/teacher/parcours/assigner' },
  { label: 'Ressources', icon: '📁', path: '/teacher/ressources' },
] as const;

export function isTeacherNavItemActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath || pathname.startsWith(`${itemPath}/`)) return true;
  if (itemPath === '/teacher/eleves' && pathname.startsWith('/teacher/eleve/')) return true;
  if (
    itemPath === '/teacher/parcours/assigner' &&
    (pathname.startsWith('/teacher/classe/') || pathname.startsWith('/teacher/groupes'))
  ) {
    return true;
  }
  return false;
}
