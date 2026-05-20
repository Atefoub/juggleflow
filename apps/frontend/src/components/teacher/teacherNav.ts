import type { IconName } from '../icons/iconRegistry';

export interface TeacherNavItem {
  label: string;
  icon: IconName;
  path: string;
}

export const TEACHER_NAV_ITEMS: readonly TeacherNavItem[] = [
  { label: "Vue d'ensemble", icon: 'nav-teacher-dashboard', path: '/teacher/dashboard' },
  { label: 'Élèves', icon: 'nav-teacher-eleves', path: '/teacher/eleves' },
  { label: 'Parcours', icon: 'nav-teacher-parcours', path: '/teacher/parcours/assigner' },
  { label: 'Ressources', icon: 'nav-teacher-ressources', path: '/teacher/ressources' },
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
