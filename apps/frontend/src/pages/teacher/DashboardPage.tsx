import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves', icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours', icon: '📚', path: '/teacher/parcours' },
  { label: 'Ressources', icon: '📁', path: '/teacher/ressources' },
];

const mockGroups = [
  { name: 'Groupe Vert', count: 8, progress: 85, color: '#22C55E', status: 'En avance' },
  { name: 'Groupe Orange', count: 10, progress: 65, color: '#FF7A00', status: 'Progression normale' },
  { name: 'Groupe Rouge', count: 6, progress: 45, color: '#FF4D4D', status: 'Nécessite attention' },
];

export default function TeacherDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#0A0E2A',
        fontFamily: 'DM Sans, sans-serif',
        maxWidth: '430px',
        margin: '0 auto',
        paddingBottom: '80px',
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-12 pb-4"
        style={{ backgroundColor: '#0D1235', borderBottom: '1px solid #1E2847' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl font-bold text-white flex-shrink-0 text-xs"
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#4068D8',
            }}
          >
            Prof
          </div>
          <div className="flex-1">
            <p
              className="font-bold text-white text-sm"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              {user
                ? `${user.firstName} ${user.lastName}`
                : 'CE1 — Classe de Mme Dupont'}
            </p>
            <p className="text-xs" style={{ color: '#5A6480' }}>
              École Primaire Jules Ferry · 24 élèves
            </p>
          </div>
          <button
            onClick={logout}
            className="text-xs px-3 py-1 rounded-lg"
            style={{ backgroundColor: '#1E2847', color: '#A0AABF' }}
          >
            Quitter
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Progression moyenne */}
        <div
          className="p-4 rounded-2xl flex items-center gap-4"
          style={{ backgroundColor: '#111638', border: '1px solid #1E2847' }}
        >
          <div className="flex-1">
            <p
              className="text-xs uppercase tracking-widest mb-1"
              style={{ color: '#5A6480' }}
            >
              Progression moyenne
            </p>
            <p
              className="text-4xl font-bold text-white"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              68%
            </p>
            <p className="text-xs mt-1" style={{ color: '#22C55E' }}>
              ↑ +5% vs semaine dernière
            </p>
          </div>
          {/* Donut simplifié */}
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: '72px',
              height: '72px',
              border: '4px solid #8B2BE2',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            68%
          </div>
        </div>

        {/* Groupes d'élèves */}
        <div>
          <h2
            className="font-bold text-white text-sm uppercase tracking-wider mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Groupes d'élèves
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #1E2847' }}
          >
            {mockGroups.map((group, index) => (
              <div
                key={group.name}
                className="flex items-center gap-3 p-4"
                style={{
                  borderBottom:
                    index < mockGroups.length - 1 ? '1px solid #1E2847' : 'none',
                  backgroundColor: '#111638',
                }}
              >
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: '10px',
                    height: '10px',
                    backgroundColor: group.color,
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{group.name}</p>
                  <p className="text-xs" style={{ color: '#5A6480' }}>
                    {group.count} élèves · {group.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: '70px' }}>
                    <ProgressBar
                      value={group.progress}
                      color={group.color}
                      height="6px"
                    />
                  </div>
                  <span
                    className="text-sm font-bold text-white"
                    style={{ minWidth: '32px', textAlign: 'right' }}
                  >
                    {group.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerte élèves bloqués */}
        <div
          className="p-4 rounded-2xl flex items-start gap-3"
          style={{
            backgroundColor: '#1A1020',
            borderLeft: '3px solid #FF7A00',
            border: '1px solid #2A1A10',
          }}
        >
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-white mb-1">
              3 élèves bloqués à l'exercice 4
            </p>
            <p className="text-xs" style={{ color: '#A0AABF' }}>
              Lucas M., Tom B., Léa P. · Voir le détail →
            </p>
          </div>
        </div>

        {/* Actions rapides */}
        <div>
          <h2
            className="font-bold text-white text-sm uppercase tracking-wider mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
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
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{
                  backgroundColor: '#111638',
                  border: '1.5px solid #1E2847',
                  color: '#A0AABF',
                  minHeight: '44px',
                }}
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