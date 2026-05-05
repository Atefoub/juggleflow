import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { studentApi, type StudentStats, type BadgeData } from '../../api/studentApi';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

const XP_PER_TRICK = 100;
const XP_MAX = 500;

const STREAK_BADGES = [
  { id: 's1', name: '3 days',  icon: '🔥', requirement: 3  },
  { id: 's2', name: '7 days',  icon: '⚡', requirement: 7  },
  { id: 's3', name: '14 days', icon: '🌟', requirement: 14 },
  { id: 's4', name: '30 days', icon: '💎', requirement: 30 },
];

const MOCK_STREAK = 5;

export default function ProgressPage() {
  const { user } = useAuth();

  const [stats, setStats]         = useState<StudentStats | null>(null);
  const [badges, setBadges]       = useState<BadgeData[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      studentApi.getStatistics(),
      studentApi.getUnlockedBadges(),
      studentApi.getAllBadges(),
    ])
      .then(([s, unlocked, all]) => {
        setStats(s);
        setBadges(unlocked);
        setAllBadges(all);
      })
      .catch(() => setError('Impossible de charger votre progression. Veuillez réessayer.'))
      .finally(() => setLoading(false));
  }, []);

  const xp        = (stats?.totalTricksLearned ?? 0) * XP_PER_TRICK;
  const xpPercent = Math.min((xp / XP_MAX) * 100, 100);

  const unlockedIds = new Set(badges.map((b) => b.id));
  const badgeGrid = [
    ...badges,
    ...allBadges.filter((b) => !unlockedIds.has(b.id)),
  ];

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-5 bg-[#0D1235] border-b border-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-11 h-11 rounded-full font-bold text-sm text-text-primary shrink-0 bg-linear-to-br from-brand to-brand-end">
            {initials}
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-text-primary text-base">Ma Progression</p>
            <p className="text-xs text-text-secondary">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </p>
          </div>
        </div>

        {/* Level + XP */}
        <div className="p-3 rounded-2xl bg-bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span role="img" aria-label="niveau" className="text-xl">⭐</span>
              <div>
                <p className="text-xs text-text-muted">Niveau actuel</p>
                <p className="font-display font-bold text-text-primary text-sm">Débutant</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Points XP</p>
              <p className="font-display font-bold text-brand text-sm">{xp} / {XP_MAX}</p>
            </div>
          </div>
          <ProgressBar value={xpPercent} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="8px" />
          <p className="text-xs text-text-muted mt-1">
            {Math.max(0, XP_MAX - xp)} XP pour le niveau suivant
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse bg-bg-card" />
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPI Cards */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Mes statistiques
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: stats?.totalTricksLearned ?? 0, label: 'Figures\napprises',  icon: '✅', iconLabel: 'figures apprises'  },
                  { value: stats?.tricksInProgress   ?? 0, label: 'En\nprogression',   icon: '🔄', iconLabel: 'en progression'     },
                  { value: stats?.badgesEarned        ?? 0, label: 'Badges\nobtenus',    icon: '🏅', iconLabel: 'badges obtenus'    },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
                  >
                    <span role="img" aria-label={stat.iconLabel} className="text-lg">{stat.icon}</span>
                    <span className="font-display text-2xl font-bold text-text-primary">
                      {stat.value}
                    </span>
                    <span className="text-[0.6rem] text-text-muted whitespace-pre-line leading-tight">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Badges */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                  Mes badges
                </h2>
                <span className="text-xs text-text-muted">
                  {badges.length} / {allBadges.length}
                </span>
              </div>

              {badgeGrid.length === 0 ? (
                <div className="p-4 rounded-2xl bg-bg-card border border-border text-xs text-text-muted text-center">
                  Aucun badge disponible pour l'instant.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {badgeGrid.map((badge) => {
                    const isUnlocked = unlockedIds.has(badge.id);
                    return (
                      <div key={badge.id} className="flex flex-col items-center gap-2">
                        <div
                          className={[
                            'flex items-center justify-center w-14 h-14 rounded-xl text-xl',
                            isUnlocked
                              ? 'bg-linear-to-br from-brand to-brand-end'
                              : 'bg-border opacity-40',
                          ].join(' ')}
                        >
                          {badge.iconUrl ? (
                            <img src={badge.iconUrl} alt={badge.name} className="w-8 h-8 object-contain" />
                          ) : (
                            <span role="img" aria-label={isUnlocked ? 'badge débloqué' : 'badge verrouillé'}>
                              {isUnlocked ? '🏅' : '🔒'}
                            </span>
                          )}
                        </div>
                        <span
                          className={[
                            'text-[0.6rem] text-center leading-tight max-w-full truncate px-1',
                            isUnlocked ? 'text-text-primary' : 'text-text-muted',
                          ].join(' ')}
                          title={badge.name}
                        >
                          {badge.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Streak badges */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                  Régularité
                </h2>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-card border border-border">
                  <span role="img" aria-label="feu" className="text-sm">🔥</span>
                  <span className="text-xs font-bold text-cta">{MOCK_STREAK} jours</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {STREAK_BADGES.map((badge) => {
                  const isUnlocked = MOCK_STREAK >= badge.requirement;
                  return (
                    <div key={badge.id} className="flex flex-col items-center gap-2">
                      <div
                        className={[
                          'flex items-center justify-center w-14 h-14 rounded-xl text-2xl',
                          isUnlocked
                            ? 'bg-[#1A1020] border border-cta'
                            : 'bg-border opacity-40',
                        ].join(' ')}
                      >
                        <span role="img" aria-label={badge.name}>
                          {isUnlocked ? badge.icon : '🔒'}
                        </span>
                      </div>
                      <span
                        className={[
                          'text-[0.6rem] text-center leading-tight',
                          isUnlocked ? 'text-cta' : 'text-text-muted',
                        ].join(' ')}
                      >
                        {badge.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 p-3 rounded-xl bg-bg-card border border-border">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-text-secondary">Progression streak</span>
                  <span className="text-xs text-text-muted">
                    {MOCK_STREAK} / {STREAK_BADGES[STREAK_BADGES.length - 1].requirement} jours
                  </span>
                </div>
                <ProgressBar
                  value={Math.min((MOCK_STREAK / STREAK_BADGES[STREAK_BADGES.length - 1].requirement) * 100, 100)}
                  color="#FF7A00"
                  height="6px"
                />
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}