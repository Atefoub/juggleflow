import { NavLink, useLocation } from 'react-router-dom';
import { ADMIN_NAV_ITEMS } from './adminNav';

interface AdminSidebarProps {
  /**
   * Callback déclenché après un clic sur un item — utilisé par le drawer
   * mobile pour se fermer automatiquement à la navigation.
   */
  onItemClick?: () => void;
}

/**
 * Sidebar de la section admin.
 *
 * - Logo + nom de la plateforme en haut.
 * - Liste de liens de navigation (source unique : `ADMIN_NAV_ITEMS`).
 * - L'état actif est calculé via React Router (`NavLink`) avec support du
 *   sous-chemin (ex. `/admin/users/42` garde "Utilisateurs" actif).
 */
export default function AdminSidebar({ onItemClick }: AdminSidebarProps) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-[var(--color-admin-border)]">
        <img
          src="/logo1.png"
          alt=""
          aria-hidden
          className="h-8 w-8 object-contain"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-[var(--color-admin-text)]">
            JuggleFlow
          </span>
          <span className="text-[0.6875rem] uppercase tracking-wider text-[var(--color-admin-text-muted)] font-semibold">
            Administration
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onItemClick}
                  className={() =>
                    [
                      'jf-admin-nav-item',
                      isActive ? 'jf-admin-nav-item-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    size={18}
                    aria-hidden
                    style={{ flexShrink: 0 }}
                  />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-5 py-4 border-t border-[var(--color-admin-border)]">
        <p className="text-[0.6875rem] text-[var(--color-admin-text-muted)] leading-relaxed">
          Console d&apos;administration de l&apos;établissement.
          Toute action est journalisée (audit).
        </p>
      </div>
    </div>
  );
}
