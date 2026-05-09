import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

interface BottomNavProps {
  items: NavItem[];
}

export default function BottomNav({ items }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around h-18 bg-bg-primary border-t border-border pb-2 max-w-[430px] mx-auto">
      {items.map((item) => {
        const pathname = location.pathname;
        const isActive =
          pathname === item.path ||
          pathname.startsWith(`${item.path}/`) ||
          // Détails élève : /student/trick/:id → onglet "Catalogue" actif
          (item.path === '/student/catalogue' && (
            pathname.startsWith('/student/trick/') ||
            pathname.startsWith('/student/session/')
          )) ||
          // Détails enseignant : /teacher/eleve/:id → onglet "Élèves" actif
          (item.path === '/teacher/eleves' && pathname.startsWith('/teacher/eleve/')) ||
          // Détail parcours enseignant : /teacher/classe/:classId/parcours/:pathId → onglet "Parcours" actif
          (item.path === '/teacher/parcours/assigner' && pathname.startsWith('/teacher/classe/'));
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            className={[
              'flex flex-col items-center gap-1 min-w-11 min-h-11 justify-center',
              'bg-transparent border-none cursor-pointer font-body text-[0.6rem]',
              isActive ? 'text-text-primary font-bold' : 'text-text-muted font-normal',
            ].join(' ')}
          >
            <div
              className={[
                'flex items-center justify-center w-8 h-8 rounded-lg text-lg text-white',
                isActive ? 'jf-nav-pill-active' : 'bg-transparent',
              ].join(' ')}
            >
              {item.icon}
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}