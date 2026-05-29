import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppIcon from '../icons/AppIcon';
import ThemeSwitcher from '../ThemeSwitcher';
import { TEACHER_NAV_ITEMS, isTeacherNavItemActive } from './teacherNav';

interface TeacherSidebarProps {
  onItemClick?: () => void;
}

export default function TeacherSidebar({ onItemClick }: TeacherSidebarProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <img src="/logo1.png" alt="" aria-hidden className="h-8 w-8 object-contain" />
        <div className="flex flex-col leading-tight">
          <span className="font-display text-sm font-bold text-text-primary">JuggleFlow</span>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
            Espace enseignant
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation enseignant">
        <ul className="flex flex-col gap-1">
          {TEACHER_NAV_ITEMS.map((item) => {
            const isActive = isTeacherNavItemActive(pathname, item.path);
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onItemClick}
                  className={[
                    'jf-teacher-nav-item',
                    isActive ? 'jf-teacher-nav-item-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <AppIcon
                    name={item.icon}
                    size={20}
                    className="shrink-0 text-current"
                    aria-hidden
                  />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border">
        <ThemeSwitcher userId={user?.id} embedded />
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[0.6875rem] leading-relaxed text-text-muted">
          Suivi des classes, parcours et ressources pédagogiques.
        </p>
      </div>
    </div>
  );
}
