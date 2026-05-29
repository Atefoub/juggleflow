import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../BottomNav';
import TeacherSidebar from './TeacherSidebar';
import { TEACHER_NAV_ITEMS } from './teacherNav';

interface TeacherLayoutProps {
  children: ReactNode;
}

/**
 * Shell enseignant : colonne mobile (~430px) + barre du bas ;
 * à partir de lg (1024px) : sidebar fixe et contenu jusqu'à max-w-7xl.
 */
export default function TeacherLayout({ children }: TeacherLayoutProps) {
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
    <div className="jf-teacher min-h-screen bg-bg-primary font-body">
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-r lg:border-border lg:bg-bg-header lg:z-30"
        aria-label="Navigation principale"
      >
        <TeacherSidebar />
      </aside>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Fermer la navigation"
          className="fixed inset-0 z-40 bg-black/55 lg:hidden cursor-default"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 bg-bg-header border-r border-border shadow-xl',
          'transform transition-transform duration-200 ease-out lg:hidden',
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
            className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-card text-text-secondary hover:text-text-primary"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
          <TeacherSidebar onItemClick={() => setDrawerOpen(false)} />
        </div>
      </aside>

      <div className="lg:pl-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-bg-header px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-card text-lg"
            aria-label="Ouvrir la navigation"
          >
            ☰
          </button>
          <img src="/logo1.png" alt="" aria-hidden className="h-7 w-7 object-contain" />
          <span className="font-display text-sm font-bold text-text-primary">JuggleFlow</span>
        </header>

        <div className="flex flex-1 flex-col w-full max-w-[430px] mx-auto lg:max-w-none lg:mx-0 pb-20 lg:pb-8">
          <div className="flex flex-1 flex-col w-full lg:max-w-7xl lg:mx-auto lg:px-8">
            {children}
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-primary border-t border-border">
          <BottomNav items={[...TEACHER_NAV_ITEMS]} />
        </div>
      </div>
    </div>
  );
}
