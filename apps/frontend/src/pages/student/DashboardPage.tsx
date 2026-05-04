import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

// Données mockées
const mockData = {
  xp: 240,
  xpMax: 500,
  level: 'Débutant',
  streak: 7,
  figuresLearned: 12,
  challenge: {
    title: 'Jongle 2 balles × 10',
    description: "Répète l'enchaînement sans interruption",
  },
  currentPath: {
    title: 'Fondamentaux — 3 balles',
    teacher: 'Mme Dupont',
    progress: 75,
    done: 12,
    total: 16,
  },
  badges: [
    { label: 'Premiers pas', unlocked: true, icon: '⭐' },
    { label: 'Précision', unlocked: true, icon: '🎯' },
    { label: 'Champion', unlocked: false, icon: '🏆' },
  ],
};

export default function StudentDashboardPage() {
  const { user, logout } = useAuth();
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'LM';
  const xpPercent = (mockData.xp / mockData.xpMax) * 100;

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
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0"
            style={{
              width: '44px',
              height: '44px',
              background: 'linear-gradient(135deg, #8B2BE2, #C724B1)',
              fontSize: '0.85rem',
            }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-xs" style={{ color: '#A0AABF' }}>Bonjour</p>
            <p className="font-bold text-white text-base">
              {user ? `${user.firstName} ${user.lastName}` : 'Lucas Martin'}
            </p>
            <p className="text-xs" style={{ color: '#5A6480' }}>
              CE1 — École Jules Ferry
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

        {/* Barre XP */}
        <div className="flex justify-between mb-2">
          <span className="text-xs" style={{ color: '#A0AABF' }}>
            Niveau {mockData.level}
          </span>
          <span className="text-xs" style={{ color: '#A0AABF' }}>
            {mockData.xp} / {mockData.xpMax} XP
          </span>
        </div>
        <ProgressBar
          value={xpPercent}
          color="linear-gradient(90deg, #8B2BE2, #C724B1)"
          height="8px"
        />
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Défi du jour */}
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: '#111638', border: '1px solid #1E2847' }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: '#FF7A00' }}
          >
            Défi du jour
          </p>
          <p className="font-bold text-white text-base mb-1">
            {mockData.challenge.title}
          </p>
          <p className="text-xs mb-4" style={{ color: '#A0AABF' }}>
            {mockData.challenge.description}
          </p>
          <button
            className="w-full py-2 rounded-xl font-bold text-white text-sm"
            style={{ backgroundColor: '#FF7A00', minHeight: '44px' }}
          >
            Commencer le défi
          </button>
        </div>

        {/* Parcours en cours */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2
              className="font-bold text-white text-sm uppercase tracking-wider"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Parcours en cours
            </h2>
            <button className="text-xs underline" style={{ color: '#A0AABF' }}>
              Voir tout
            </button>
          </div>
          <div
            className="p-4 rounded-2xl"
            style={{ backgroundColor: '#111638', border: '1px solid #1E2847' }}
          >
            <p className="font-bold text-white text-sm mb-1">
              {mockData.currentPath.title}
            </p>
            <p className="text-xs mb-3" style={{ color: '#5A6480' }}>
              Assigné par {mockData.currentPath.teacher} ·{' '}
              {mockData.currentPath.done}/{mockData.currentPath.total} figures
            </p>
            <ProgressBar value={mockData.currentPath.progress} color="#8B2BE2" />
            <div className="flex justify-between mt-2">
              <span className="text-xs" style={{ color: '#A0AABF' }}>
                {mockData.currentPath.progress}% complété
              </span>
              <span className="text-xs font-bold text-white">
                {mockData.currentPath.total - mockData.currentPath.done} restantes
              </span>
            </div>
          </div>
        </div>

        {/* Stats rapides */}
        <div>
          <h2
            className="font-bold text-white text-sm uppercase tracking-wider mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Mes stats
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: mockData.figuresLearned, label: 'Figures apprises' },
              { value: mockData.streak, label: 'Jours de suite' },
              { value: mockData.xp, label: 'Points XP' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 rounded-xl flex flex-col gap-1"
                style={{ backgroundColor: '#111638', border: '1px solid #1E2847' }}
              >
                <span
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {stat.value}
                </span>
                <span className="text-xs" style={{ color: '#5A6480' }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges récents */}
        <div>
          <h2
            className="font-bold text-white text-sm uppercase tracking-wider mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Badges récents
          </h2>
          <div className="flex gap-4">
            {mockData.badges.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: '52px',
                    height: '52px',
                    background: badge.unlocked
                      ? 'linear-gradient(135deg, #8B2BE2, #C724B1)'
                      : '#1E2847',
                    opacity: badge.unlocked ? 1 : 0.45,
                    fontSize: '1.4rem',
                  }}
                >
                  {badge.icon}
                </div>
                <span
                  className="text-xs text-center"
                  style={{ color: badge.unlocked ? '#FFFFFF' : '#5A6480' }}
                >
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav items={navItems} />
    </div>
  );
}