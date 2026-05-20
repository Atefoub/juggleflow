import type { ComponentType, SVGProps } from 'react';

import NavAccueil from '../../assets/icons/nav-accueil.svg?react';
import NavCatalogue from '../../assets/icons/nav-catalogue.svg?react';
import NavProgression from '../../assets/icons/nav-progression.svg?react';
import NavProfil from '../../assets/icons/nav-profil.svg?react';
import NavTeacherDashboard from '../../assets/icons/nav-teacher-dashboard.svg?react';
import NavTeacherEleves from '../../assets/icons/nav-teacher-eleves.svg?react';
import NavTeacherParcours from '../../assets/icons/nav-teacher-parcours.svg?react';
import NavTeacherRessources from '../../assets/icons/nav-teacher-ressources.svg?react';
import StatusMastered from '../../assets/icons/status-mastered.svg?react';
import StatusInProgress from '../../assets/icons/status-in-progress.svg?react';
import StatusLocked from '../../assets/icons/status-locked.svg?react';
import BadgeStreak7 from '../../assets/icons/badge-streak-7.svg?react';
import BadgeStreak30 from '../../assets/icons/badge-streak-30.svg?react';
import BadgeStreak100 from '../../assets/icons/badge-streak-100.svg?react';
import BadgeMastery10 from '../../assets/icons/badge-mastery-10.svg?react';
import BadgeMastery25 from '../../assets/icons/badge-mastery-25.svg?react';
import BadgeMastery50 from '../../assets/icons/badge-mastery-50.svg?react';
import AdminDashboard from '../../assets/icons/admin-dashboard.svg?react';
import AdminUsers from '../../assets/icons/admin-users.svg?react';
import AdminClasses from '../../assets/icons/admin-classes.svg?react';
import AdminResources from '../../assets/icons/admin-resources.svg?react';
import AdminShield from '../../assets/icons/admin-shield.svg?react';
import AdminAudit from '../../assets/icons/admin-audit.svg?react';
import AdminMenu from '../../assets/icons/admin-menu.svg?react';
import AdminClose from '../../assets/icons/admin-close.svg?react';
import AdminLogout from '../../assets/icons/admin-logout.svg?react';

export const ICONS = {
  'nav-accueil': NavAccueil,
  'nav-catalogue': NavCatalogue,
  'nav-progression': NavProgression,
  'nav-profil': NavProfil,
  'nav-teacher-dashboard': NavTeacherDashboard,
  'nav-teacher-eleves': NavTeacherEleves,
  'nav-teacher-parcours': NavTeacherParcours,
  'nav-teacher-ressources': NavTeacherRessources,
  'status-mastered': StatusMastered,
  'status-in-progress': StatusInProgress,
  'status-locked': StatusLocked,
  'badge-streak-7': BadgeStreak7,
  'badge-streak-30': BadgeStreak30,
  'badge-streak-100': BadgeStreak100,
  'badge-mastery-10': BadgeMastery10,
  'badge-mastery-25': BadgeMastery25,
  'badge-mastery-50': BadgeMastery50,
  'admin-dashboard': AdminDashboard,
  'admin-users': AdminUsers,
  'admin-classes': AdminClasses,
  'admin-resources': AdminResources,
  'admin-shield': AdminShield,
  'admin-audit': AdminAudit,
  'admin-menu': AdminMenu,
  'admin-close': AdminClose,
  'admin-logout': AdminLogout,
} as const;

export type IconName = keyof typeof ICONS;

export type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number }
>;

/** Composant SVG avec prop `size` (sidebar admin, etc.). */
export function createSizedIcon(name: IconName): IconComponent {
  const Svg = ICONS[name];
  return function SizedIcon({
    size = 24,
    className,
    ...rest
  }: SVGProps<SVGSVGElement> & { size?: number }) {
    return (
      <Svg
        width={size}
        height={size}
        className={className}
        aria-hidden
        focusable={false}
        {...rest}
      />
    );
  };
}

export const BADGE_ICON_BY_ID: Record<string, IconName> = {
  s1: 'badge-streak-7',
  s2: 'badge-streak-30',
  s3: 'badge-streak-100',
  m1: 'badge-mastery-10',
  m2: 'badge-mastery-25',
  m3: 'badge-mastery-50',
};

export type ProgressStatusKey = 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';

export const PROGRESS_STATUS_ICON: Record<
  Exclude<ProgressStatusKey, 'NOT_STARTED'>,
  IconName
> = {
  MASTERED: 'status-mastered',
  IN_PROGRESS: 'status-in-progress',
};
