import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard'  },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves'     },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours'   },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

const mockGroups = [
  { name: 'Groupe Vert',   count: 8,  progress: 85, color: '#22C55E', status: 'En avance'           },
  { name: 'Groupe Orange', count: 10, progress: 65, color: '#FF7A00', status: 'Progression normale'  },
  { name: 'Groupe Rouge',  count: 6,  progress: 45, color: '#FF4D4D', status: 'Nécessite attention'  },
];

export default function TeacherDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl font-bold text-white shrink-0 text-xs bg-teacher">
            Prof
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-text-primary text-sm">
              {user ? `${user.firstName} ${user.lastName}` : 'CE1 — Classe de Mme Dupont'}
            </p>
            <p className="text-xs text-text-muted">
              École Primaire Jules Ferry · 24 élèves
            </p>
          </div>
          <button
            onClick={logout}
            className="text-xs px-3 py-1 rounded-lg bg-border text-text-secondary hover:opacity-80 transition-opacity"
          >
            Quitter
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Progression moyenne */}
        <div className="p-4 rounded-2xl flex items-center gap-4 bg-bg-card border border-border">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest mb-1 text-text-muted">
              Progression moyenne
            </p>
            <p className="font-display text-4xl font-bold text-text-primary">68%</p>
            <p className="text-xs mt-1 text-success">↑ +5% vs semaine dernière</p>
          </div>
          {/* Donut simplifié */}
          <div className="flex items-center justify-center w-18 h-18 rounded-full shrink-0 border-4 border-brand text-xs font-bold text-text-primary">
            68%
          </div>
        </div>

        {/* Groupes d'élèves */}
        <div>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Groupes d'élèves
          </h2>
          <div className="rounded-2xl overflow-hidden border border-border divide-y divide-border">
            {mockGroups.map((group) => (
              <div
                key={group.name}
                className="flex items-center gap-3 p-4 bg-bg-card"
              >
                {/* Dot — color is runtime data */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary">{group.name}</p>
                  <p className="text-xs text-text-muted">
                    {group.count} élèves · {group.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-17.5">
                    <ProgressBar value={group.progress} color={group.color} height="6px" />
                  </div>
                  <span className="text-sm font-bold text-text-primary min-w-8 text-right">
                    {group.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerte élèves bloqués */}
        <div className="p-4 rounded-2xl flex items-start gap-3 bg-[#1A1020] border border-[#2A1A10] border-l-4 border-l-cta">
          <span className="text-lg shrink-0" role="img" aria-label="alerte">⚠️</span>
          <div>
            <p className="text-sm font-bold text-text-primary mb-1">
              3 élèves bloqués à l'exercice 4
            </p>
            <p className="text-xs text-text-secondary">
              Lucas M., Tom B., Léa P. · Voir le détail →
            </p>
          </div>
        </div>

        {/* Actions rapides */}
        <div>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Actions rapides
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              '+ Assigner un parcours',
              '↓ Générer rapport',
              '+ Ajouter un élève',
            ].map((action) => (
              <button
                key={action}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-bg-card border border-border text-text-secondary min-h-11 hover:border-teacher/50 hover:text-text-primary transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav items={navItems} />
    </div>
  );
}