import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import { IconClose, IconLogout, IconMenu } from './AdminIcons';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Shell de la section administration.
 *
 * - Desktop (lg+, >= 1024px) : sidebar fixe à gauche (240px), zone de contenu
 *   à droite avec topbar fine (h-16).
 * - Mobile / tablette : pas de sidebar visible. Bouton hamburger en topbar
 *   ouvre un drawer plein hauteur (overlay sombre, sortie au clic ou Escape).
 *
 * Thème : entièrement clair via le wrapper `.jf-admin` (cf. index.css).
 * Le reste de l'application (student/teacher/login) conserve le thème sombre.
 *
 * Pour l'utiliser, wrapper chaque page admin :
 *   <AdminLayout><AdminUsersPage /></AdminLayout>
 *
 * Ou, plus DRY, via le helper `admin(...)` dans AppRouter.tsx.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <div className="jf-admin">
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-r lg:border-[var(--color-admin-border)] lg:bg-[var(--color-admin-surface)] lg:z-30"
        aria-label="Navigation principale"
      >
        <AdminSidebar />
      </aside>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Fermer la navigation"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden cursor-default"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 bg-[var(--color-admin-surface)] border-r border-[var(--color-admin-border)] shadow-xl',
          'transform transition-transform duration-200 ease-out',
          'lg:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!drawerOpen}
      >
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="jf-admin-btn-ghost absolute top-3 right-3"
            aria-label="Fermer le menu"
          >
            <IconClose size={20} />
          </button>
          <AdminSidebar onItemClick={() => setDrawerOpen(false)} />
        </div>
      </aside>

      <div className="lg:pl-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 lg:px-8 bg-[var(--color-admin-surface)] border-b border-[var(--color-admin-border)]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="jf-admin-btn-ghost lg:hidden"
            aria-label="Ouvrir la navigation"
          >
            <IconMenu size={22} />
          </button>

          <div className="lg:hidden flex items-center gap-2">
            <img
              src="/logo1.png"
              alt=""
              aria-hidden
              className="h-7 w-7 object-contain"
            />
            <span className="text-sm font-bold text-[var(--color-admin-text)]">
              JuggleFlow
            </span>
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2 pr-1">
            <span className="text-xs text-[var(--color-admin-text-muted)] uppercase tracking-wider font-semibold">
              Administrateur
            </span>
            <span className="text-sm font-semibold text-[var(--color-admin-text)]">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="jf-admin-btn-secondary"
            aria-label="Se déconnecter"
          >
            <IconLogout size={16} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
