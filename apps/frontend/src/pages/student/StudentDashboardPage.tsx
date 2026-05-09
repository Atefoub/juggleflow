import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { studentApi, type StudentStats, type BadgeData, type LearningPath } from '../../api/studentApi';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { flushProgressUpdates, getPendingProgressUpdatesCount } from '../../utils/offlineQueue';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

const XP_PER_TRICK = 100;
const XP_MAX = 500;

export default function StudentDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const [stats, setStats]         = useState<StudentStats | null>(null);
  const [badges, setBadges]       = useState<BadgeData[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [paths, setPaths]         = useState<LearningPath[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [syncHint, setSyncHint]   = useState<string | null>(null);

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

  // Synchronisation des actions offline (progression) quand on repasse en ligne.
  useEffect(() => {
    if (!isOnline) return;
    if (!user?.id) return;

    const pending = getPendingProgressUpdatesCount(user.id);
    if (pending === 0) return;

    setSyncHint(`Synchronisation en cours (${pending})…`);
    flushProgressUpdates(user.id, async (u) => {
      await studentApi.updateProgress(u.trickId, {
        status: u.status,
        masteryScore: u.masteryScore,
      });
    })
      .then((r) => {
        if (r.applied > 0) setSyncHint(`Synchronisé: ${r.applied} mise(s) à jour.`);
        else setSyncHint(null);
        setTimeout(() => setSyncHint(null), 3500);
      })
      .catch(() => setSyncHint(null));
  }, [isOnline, user?.id]);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  const xp          = (stats?.totalTricksLearned ?? 0) * XP_PER_TRICK;
  const xpPercent   = Math.min((xp / XP_MAX) * 100, 100);
  const xpDisplay   = Math.min(xp, XP_MAX);
  const currentPath = paths[0] ?? null;

  const unlockedIds   = new Set(badges.map((b) => b.id));
  const displayBadges = [
    ...badges.slice(0, 3),
    ...allBadges
      .filter((b) => !unlockedIds.has(b.id))
      .slice(0, Math.max(0, 3 - badges.length)),
  ].slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* ── Header ── */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-full font-bold text-sm text-text-primary shrink-0 bg-linear-to-br from-brand to-brand-end">
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
          <span className="text-xs text-text-secondary">{xpDisplay} / {XP_MAX} XP</span>
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

        {syncHint && (
          <div className="p-3 rounded-2xl text-xs text-text-secondary bg-bg-card border border-border">
            {syncHint}
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
            {/* ── Défi du jour (wireframes) ── */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Défi du jour
              </h2>
              <div className="p-4 rounded-2xl bg-bg-card border border-border flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-text-primary text-sm truncate">Jongle 2 balles × 10</p>
                  <p className="text-xs text-text-muted mt-1">
                    Répète l'enchaînement sans interruption
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/student/catalogue')}
                  className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-linear-to-br from-brand to-brand-end min-h-11 hover:opacity-90 transition-opacity"
                >
                  Commencer
                </button>
              </div>
            </section>

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
                          'flex items-center justify-center w-13 h-13 rounded-xl text-lg',
                          badge.unlocked
                            ? 'bg-linear-to-br from-brand to-brand-end'
                            : 'bg-border opacity-45',
                        ].join(' ')}
                      >
                        {badge.iconUrl ? (
                          <img src={badge.iconUrl} alt={badge.name} className="w-7" />
                        ) : (
                          <span role="img" aria-label={badge.unlocked ? 'badge débloqué' : 'badge verrouillé'}>
                            {badge.unlocked ? '🏅' : '🔒'}
                          </span>
                        )}
                      </div>
                      <span
                        className={[
                          'text-xs text-center max-w-15 truncate',
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

            {/* ── À explorer (wireframes) ── */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                À explorer
              </h2>
              <div className="p-4 rounded-2xl bg-bg-card border border-border flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-text-primary text-sm truncate">
                    Vidéos, exercices et modules
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Pour progresser entre deux sessions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/student/resources')}
                  className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary bg-bg-card border border-border hover:opacity-80 transition-opacity min-h-11"
                >
                  Voir →
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}