import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

const MOCK_STATS = {
  tricksLearned: 12,
  totalTime: '3h 20min',
  streakDays: 5,
};

const MOCK_PATH = {
  name: 'Parcours Débutant',
  progress: 60,
  level: 'Débutant',
};

export default function StudentProfilePage() {
  const { user, logout } = useAuth();

  const [notificationsOn, setNotificationsOn] = useState(true);
  const [darkMode, setDarkMode]               = useState(true);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-6 bg-[#0D1235] border-b border-border flex flex-col items-center gap-3">
        <div className="flex items-center justify-center w-20 h-20 rounded-full font-bold text-2xl text-text-primary bg-linear-to-br from-brand to-brand-end">
          {initials}
        </div>

        <div className="text-center">
          <p className="font-display font-bold text-text-primary text-lg">
            {user ? `${user.firstName} ${user.lastName}` : '—'}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            Élève · Niveau {MOCK_PATH.level}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          <span className="px-3 py-1 rounded-full text-xs bg-bg-card border border-border text-text-secondary">
            <span role="img" aria-label="école" className="mr-1">🏫</span>
            École JuggleFlow
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-bg-card border border-border text-text-secondary">
            <span role="img" aria-label="classe" className="mr-1">📚</span>
            6ème A
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Stats */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Mes statistiques
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: MOCK_STATS.tricksLearned,          label: 'Figures\napprises', icon: '✅', iconLabel: 'figures apprises' },
              { value: MOCK_STATS.totalTime,               label: 'Temps\ntotal',      icon: '⏱️', iconLabel: 'temps total'      },
              { value: `${MOCK_STATS.streakDays}j`,        label: 'Jours\nde suite',   icon: '🔥', iconLabel: 'jours de suite'   },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
              >
                <span role="img" aria-label={stat.iconLabel} className="text-lg">{stat.icon}</span>
                <span className="font-display text-xl font-bold text-text-primary leading-tight">
                  {stat.value}
                </span>
                <span className="text-[0.6rem] text-text-muted whitespace-pre-line leading-tight">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Assigned path */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Parcours assigné
          </h2>
          <div className="p-4 rounded-2xl bg-bg-card border border-border">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-text-primary text-sm">{MOCK_PATH.name}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-border text-text-secondary">
                {MOCK_PATH.level}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-xs text-text-muted">Progression</span>
              <span className="text-xs text-text-secondary font-bold">{MOCK_PATH.progress}%</span>
            </div>
            <ProgressBar value={MOCK_PATH.progress} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="8px" />
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Préférences
          </h2>
          <div className="rounded-2xl overflow-hidden border border-border divide-y divide-border">

            {/* Notifications */}
            <div className="flex items-center justify-between p-4 bg-bg-card">
              <div className="flex items-center gap-3">
                <span role="img" aria-label="notifications" className="text-lg">🔔</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Notifications</p>
                  <p className="text-xs text-text-muted">Rappels d'entraînement</p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsOn((v) => !v)}
                aria-label={notificationsOn ? 'Désactiver les notifications' : 'Activer les notifications'}
                className={[
                  'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
                  notificationsOn ? 'bg-brand' : 'bg-border',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                    notificationsOn ? 'translate-x-5' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </button>
            </div>

            {/* Dark mode */}
            <div className="flex items-center justify-between p-4 bg-bg-card">
              <div className="flex items-center gap-3">
                <span role="img" aria-label="mode foncé" className="text-lg">🌙</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Mode foncé</p>
                  <p className="text-xs text-text-muted">Thème sombre actif</p>
                </div>
              </div>
              <button
                onClick={() => setDarkMode((v) => !v)}
                aria-label={darkMode ? 'Désactiver le mode foncé' : 'Activer le mode foncé'}
                className={[
                  'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
                  darkMode ? 'bg-brand' : 'bg-border',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                    darkMode ? 'translate-x-5' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Logout */}
        <section>
          <button
            onClick={logout}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-alert border border-alert bg-[#2A1020] hover:opacity-80 transition-opacity min-h-11"
          >
            Se déconnecter
          </button>
        </section>

      </main>

      <BottomNav items={navItems} />
    </div>
  );
}