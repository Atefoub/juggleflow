import type { ComponentType, SVGProps } from 'react';
import {
  IconAudit,
  IconClasses,
  IconDashboard,
  IconResources,
  IconShield,
  IconUsers,
} from './AdminIcons';

/**
 * Source unique de vérité pour la navigation admin.
 *
 * Avant : le tableau navItems était dupliqué dans AdminUsersPage,
 * AdminClassesPage, AdminRgpdPage et AdminAuditPage (et un layout différent
 * pour AdminDashboardPage). Toute modification (ajout d'une route, renommage)
 * obligeait à toucher 4 fichiers et risquait des incohérences visuelles.
 *
 * Désormais : AdminSidebar consomme ce module et c'est tout.
 */

export interface AdminNavItem {
  /** Libellé affiché dans la sidebar. */
  label: string;
  /** Chemin React Router. */
  path: string;
  /** Icône SVG (composant) — héritage `currentColor`. */
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { label: 'Tableau de bord', path: '/admin/dashboard', icon: IconDashboard },
  { label: 'Utilisateurs',    path: '/admin/users',     icon: IconUsers     },
  { label: 'Classes',         path: '/admin/classes',   icon: IconClasses   },
  { label: 'Ressources',      path: '/admin/resources', icon: IconResources },
  { label: 'RGPD',            path: '/admin/rgpd',      icon: IconShield    },
  { label: 'Journal d\u2019audit', path: '/admin/audit', icon: IconAudit    },
] as const;
