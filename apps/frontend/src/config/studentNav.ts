import type { IconName } from '../components/icons/iconRegistry';

export interface StudentNavItem {
  label: string;
  icon: IconName;
  path: string;
}

export const STUDENT_NAV_ITEMS: readonly StudentNavItem[] = [
  { label: 'Accueil', icon: 'nav-accueil', path: '/student/dashboard' },
  { label: 'Catalogue', icon: 'nav-catalogue', path: '/student/catalogue' },
  { label: 'Progression', icon: 'nav-progression', path: '/student/progression' },
  { label: 'Profil', icon: 'nav-profil', path: '/student/profil' },
] as const;
