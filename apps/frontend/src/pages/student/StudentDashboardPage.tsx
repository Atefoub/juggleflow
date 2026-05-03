import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { studentApi, type StudentStats, type BadgeData, type LearningPath } from '../../api/studentApi';

// ─── Chemin de ce fichier ────────────────────────────────────────────────────
// Placer ce fichier dans :  apps/frontend/src/pages/student/DashboardPage.tsx
// ou                     :  apps/frontend/src/pages/student/StudentDashboardPage.tsx
// L'import ci-dessus suppose que le fichier est dans pages/student/ (2 niveaux)
// ─────────────────────────────────────────────────────────────────────────────

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/catalogue' },
  { label: 'Progression', icon: '📊', path: '/progression' },
  { label: 'Profil',      icon: '👤', path: '/profil' },
];

const XP_PER_TRICK = 100;
const XP_MAX = 500;

export default function StudentDashboardPage() {
  const { user, logout } = useAuth();

  const [stats, setStats]         = useState<StudentStats | null>(null);
  const [badges, setBadges]       = useState<BadgeData[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [paths, setPaths]         = useState<LearningPath[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      studentApi.getStatistics(),
      studentApi.getUnlockedBadges(),
      studentApi.getAllBadges(),
      studentApi.getMyLearningPaths(),
    ])
      .then(([s, unlocked, all, p]) => {
        setStats(s);
        setBadges(unlocked);
        setAllBadges(all);
        setPaths(p);
      })
      .catch(() => setError('Impossible de charger les données. Veuillez réessayer.'))
      .finally(() => setLoading(false));
  }, []);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  const xp          = (stats?.totalTricksLearned ?? 0) * XP_PER_TRICK;
  const xpPercent   = Math.min((xp / XP_MAX) * 100, 100);
  const currentPath = paths[0] ?? null;

  const unlockedIds   = new Set(badges.map((b) => b.id));
  const displayBadges = [
    ...badges.slice(0, 3),
    ...allBadges
      .filter((b) => !unlockedIds.has(b.id))
      .slice(0, Math.max(0, 3 - badges.length)),
  ].slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-[430px] mx-auto pb-20">

      {/* ── Header ── */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-full font-bold text-sm text-text-primary shrink-0 bg-gradient-to-br from-brand to-brand-end">
            {initials}
          </div>

          <div className="flex-1">
            <p className="text-xs text-text-secondary">Bonjour</p>
            <p className="font-bold text-text-primary text-base">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </p>
          </div>

          <button
            onClick={logout}
            className="text-xs px-3 py-1 rounded-lg bg-border text-text-secondary hover:opacity-80 transition-opacity"
          >
            Quitter
          </button>
        </div>

        {/* Barre XP */}
        <div className="flex justify-between mb-2">
          <span className="text-xs text-text-secondary">Points XP</span>
          <span className="text-xs text-text-secondary">{xp} / {XP_MAX} XP</span>
        </div>
        <ProgressBar value={xpPercent} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="8px" />
      </header>

      {/* ── Contenu scrollable ── */}
      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Erreur */}
        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {/* Skeleton de chargement */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse bg-bg-card" />
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Parcours en cours ── */}
            {currentPath ? (
              <section>
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                  Parcours en cours
                </h2>
                <div className="p-4 rounded-2xl bg-bg-card border border-border">
                  <p className="font-bold text-text-primary text-sm mb-1">{currentPath.pathName}</p>
                  {currentPath.targetLevel && (
                    <p className="text-xs text-text-secondary mb-1">
                      Niveau : {currentPath.targetLevel}
                    </p>
                  )}
                  <p className="text-xs text-text-muted mb-3">
                    {currentPath.stepCount} figure{currentPath.stepCount > 1 ? 's' : ''} au programme
                  </p>
                  <ProgressBar
                    value={
                      currentPath.stepCount > 0
                        ? Math.round(
                            ((stats?.totalTricksLearned ?? 0) / currentPath.stepCount) * 100
                          )
                        : 0
                    }
                    color="#8B2BE2"
                  />
                </div>
              </section>
            ) : (
              <div className="p-4 rounded-2xl text-sm bg-bg-card border border-border text-text-secondary">
                Aucun parcours assigné pour l'instant.
              </div>
            )}

            {/* ── Stats rapides ── */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Mes stats
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: stats?.totalTricksLearned ?? '—', label: 'Figures apprises' },
                  { value: stats?.tricksInProgress   ?? '—', label: 'En progression'   },
                  { value: stats?.badgesEarned        ?? '—', label: 'Badges obtenus'   },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
                  >
                    <span className="font-display text-2xl font-bold text-text-primary">
                      {stat.value}
                    </span>
                    <span className="text-xs text-text-muted">{stat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Badges récents ── */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Badges récents
              </h2>
              {displayBadges.length === 0 ? (
                <p className="text-xs text-text-muted">Aucun badge disponible pour l'instant.</p>
              ) : (
                <div className="flex gap-4">
                  {displayBadges.map((badge) => (
                    <div key={badge.id} className="flex flex-col items-center gap-2">
                      <div
                        className={[
                          'flex items-center justify-center w-[52px] h-[52px] rounded-xl text-lg',
                          badge.unlocked
                            ? 'bg-gradient-to-br from-brand to-brand-end'
                            : 'bg-border opacity-45',
                        ].join(' ')}
                      >
                        {badge.iconUrl ? (
                          <img src={badge.iconUrl} alt={badge.name} className="w-7" />
                        ) : (
                          badge.unlocked ? '🏅' : '🔒'
                        )}
                      </div>
                      <span
                        className={[
                          'text-xs text-center max-w-[60px] truncate',
                          badge.unlocked ? 'text-text-primary' : 'text-text-muted',
                        ].join(' ')}
                        title={badge.name}
                      >
                        {badge.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}