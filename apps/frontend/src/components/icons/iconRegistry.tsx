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
import InlineMastered from '../../assets/icons/inline-mastered.svg?react';
import InlineInProgress from '../../assets/icons/inline-in-progress.svg?react';
import LevelBeginner from '../../assets/icons/level-beginner.svg?react';
import LevelIntermediate from '../../assets/icons/level-intermediate.svg?react';
import LevelAdvanced from '../../assets/icons/level-advanced.svg?react';
import RankBronze from '../../assets/icons/rank-bronze.svg?react';
import RankSilver from '../../assets/icons/rank-silver.svg?react';
import RankGold from '../../assets/icons/rank-gold.svg?react';
import ResourceVideo1 from '../../assets/icons/resource-video-1.svg?react';
import ResourceVideo2 from '../../assets/icons/resource-video-2.svg?react';
import ResourceVideo3 from '../../assets/icons/resource-video-3.svg?react';
import ResourceExercise1 from '../../assets/icons/resource-exercise-1.svg?react';
import ResourceExercise2 from '../../assets/icons/resource-exercise-2.svg?react';
import ResourceExercise3 from '../../assets/icons/resource-exercise-3.svg?react';
import TagPopular from '../../assets/icons/tag-popular.svg?react';
import AlertWarning from '../../assets/icons/alert-warning.svg?react';
import Search from '../../assets/icons/search.svg?react';
import Juggler from '../../assets/icons/juggler.svg?react';
import XpStar from '../../assets/icons/xp-star.svg?react';
import Timer from '../../assets/icons/timer.svg?react';
import TipLightbulb from '../../assets/icons/tip-lightbulb.svg?react';
import TipTarget from '../../assets/icons/tip-target.svg?react';
import Brain from '../../assets/icons/brain.svg?react';
import Bell from '../../assets/icons/bell.svg?react';
import Moon from '../../assets/icons/moon.svg?react';
import Offline from '../../assets/icons/offline.svg?react';
import PdfDocument from '../../assets/icons/pdf-document.svg?react';
import Play from '../../assets/icons/play.svg?react';
import Pause from '../../assets/icons/pause.svg?react';
import GuideBook from '../../assets/icons/guide-book.svg?react';
import ChartBar from '../../assets/icons/chart-bar.svg?react';
import Clipboard from '../../assets/icons/clipboard.svg?react';
import LinkExternal from '../../assets/icons/link-external.svg?react';
import Download from '../../assets/icons/download.svg?react';
import StarFilled from '../../assets/icons/star-filled.svg?react';
import StarOutline from '../../assets/icons/star-outline.svg?react';
import FlagFrance from '../../assets/icons/flag-france.svg?react';
import School from '../../assets/icons/school.svg?react';
import StudentUser from '../../assets/icons/student-user.svg?react';
import TeacherUser from '../../assets/icons/teacher-user.svg?react';
import Lock from '../../assets/icons/lock.svg?react';
import AdminDashboard from '../../assets/icons/admin-dashboard.svg?react';
import AdminUsers from '../../assets/icons/admin-users.svg?react';
import AdminClasses from '../../assets/icons/admin-classes.svg?react';
import AdminResources from '../../assets/icons/admin-resources.svg?react';
import AdminShield from '../../assets/icons/admin-shield.svg?react';
import AdminAudit from '../../assets/icons/admin-audit.svg?react';
import AdminMenu from '../../assets/icons/admin-menu.svg?react';
import AdminClose from '../../assets/icons/admin-close.svg?react';
import AdminLogout from '../../assets/icons/admin-logout.svg?react';
import BadgeStreak7 from '../../assets/badges/badge-streak-7.svg?react';
import BadgeStreak30 from '../../assets/badges/badge-streak-30.svg?react';
import BadgeStreak100 from '../../assets/badges/badge-streak-100.svg?react';
import BadgeMastery10 from '../../assets/badges/badge-mastery-10.svg?react';
import BadgeMastery25 from '../../assets/badges/badge-mastery-25.svg?react';
import BadgeMastery50 from '../../assets/badges/badge-mastery-50.svg?react';
import BadgeRankBronze from '../../assets/badges/badge-rank-bronze.svg?react';
import BadgeRankSilver from '../../assets/badges/badge-rank-silver.svg?react';
import BadgeRankGold from '../../assets/badges/badge-rank-gold.svg?react';

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
  'inline-mastered': InlineMastered,
  'inline-in-progress': InlineInProgress,
  'level-beginner': LevelBeginner,
  'level-intermediate': LevelIntermediate,
  'level-advanced': LevelAdvanced,
  'rank-bronze': RankBronze,
  'rank-silver': RankSilver,
  'rank-gold': RankGold,
  'resource-video-1': ResourceVideo1,
  'resource-video-2': ResourceVideo2,
  'resource-video-3': ResourceVideo3,
  'resource-exercise-1': ResourceExercise1,
  'resource-exercise-2': ResourceExercise2,
  'resource-exercise-3': ResourceExercise3,
  'tag-popular': TagPopular,
  'alert-warning': AlertWarning,
  search: Search,
  juggler: Juggler,
  'xp-star': XpStar,
  timer: Timer,
  'tip-lightbulb': TipLightbulb,
  'tip-target': TipTarget,
  brain: Brain,
  bell: Bell,
  moon: Moon,
  offline: Offline,
  'pdf-document': PdfDocument,
  play: Play,
  pause: Pause,
  'guide-book': GuideBook,
  'chart-bar': ChartBar,
  clipboard: Clipboard,
  'link-external': LinkExternal,
  download: Download,
  'star-filled': StarFilled,
  'star-outline': StarOutline,
  'flag-france': FlagFrance,
  school: School,
  'student-user': StudentUser,
  'teacher-user': TeacherUser,
  lock: Lock,
  'badge-streak-7': BadgeStreak7,
  'badge-streak-30': BadgeStreak30,
  'badge-streak-100': BadgeStreak100,
  'badge-mastery-10': BadgeMastery10,
  'badge-mastery-25': BadgeMastery25,
  'badge-mastery-50': BadgeMastery50,
  'badge-rank-bronze': BadgeRankBronze,
  'badge-rank-silver': BadgeRankSilver,
  'badge-rank-gold': BadgeRankGold,
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

export type OnboardingLevelKey = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export const ONBOARDING_LEVEL_ICON: Record<OnboardingLevelKey, IconName> = {
  BEGINNER: 'level-beginner',
  INTERMEDIATE: 'level-intermediate',
  ADVANCED: 'level-advanced',
};

export const TRICK_LEVEL_ICON: Record<string, IconName> = {
  Beginner: 'level-beginner',
  Intermediate: 'level-intermediate',
  Advanced: 'level-advanced',
};

export type StudentRankKey = 'bronze' | 'silver' | 'gold';

export const RANK_BADGE_ICON: Record<StudentRankKey, IconName> = {
  bronze: 'badge-rank-bronze',
  silver: 'badge-rank-silver',
  gold: 'badge-rank-gold',
};

export const RANK_INLINE_ICON: Record<StudentRankKey, IconName> = {
  bronze: 'rank-bronze',
  silver: 'rank-silver',
  gold: 'rank-gold',
};

export const RESOURCE_VIDEO_ICONS: IconName[] = [
  'resource-video-1',
  'resource-video-2',
  'resource-video-3',
];

export const RESOURCE_EXERCISE_ICONS: IconName[] = [
  'resource-exercise-1',
  'resource-exercise-2',
  'resource-exercise-3',
];

export type ProgressStatusKey = 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';

export const PROGRESS_STATUS_ICON: Record<
  Exclude<ProgressStatusKey, 'NOT_STARTED'>,
  IconName
> = {
  MASTERED: 'inline-mastered',
  IN_PROGRESS: 'inline-in-progress',
};
