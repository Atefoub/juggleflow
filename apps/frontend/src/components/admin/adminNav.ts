import type { ComponentType, SVGProps } from 'react';
import { createSizedIcon } from '../icons/iconRegistry';

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
  { label: 'Tableau de bord', path: '/admin/dashboard', icon: createSizedIcon('admin-dashboard') },
  { label: 'Utilisateurs',    path: '/admin/users',     icon: createSizedIcon('admin-users')     },
  { label: 'Classes',         path: '/admin/classes',   icon: createSizedIcon('admin-classes')   },
  { label: 'Ressources',      path: '/admin/resources', icon: createSizedIcon('admin-resources') },
  { label: 'RGPD',            path: '/admin/rgpd',      icon: createSizedIcon('admin-shield')    },
  { label: 'Journal d\u2019audit', path: '/admin/audit', icon: createSizedIcon('admin-audit')    },
] as const;
