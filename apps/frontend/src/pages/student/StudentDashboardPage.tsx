import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import type {
  StudentStats,
  BadgeData,
  LearningPath,
  DailyChallenge,
} from '../../api/studentApi';
import {
  getStudentBadges,
  getStudentDailyChallenge,
  getStudentLearningPaths,
  getStudentProgress,
  getStudentStatistics,
} from '../../api/studentOffline';
import PathTrickList from '../../components/student/PathTrickList';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import OfflineBanner from '../../components/OfflineBanner';
import { mergePendingIntoProgress } from '../../utils/offlineQueue';

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
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [progressByTrickId, setProgressByTrickId] = useState<
    Record<number, 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED'>
  >({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      getStudentStatistics(isOnline, user.id),
      getStudentBadges(isOnline, user.id),
      getStudentLearningPaths(isOnline, user.id),
      getStudentDailyChallenge(isOnline, user.id),
      getStudentProgress(isOnline, user.id).then((progress) =>
        mergePendingIntoProgress(user.id, progress),
      ),
    ])
      .then(([s, badgeBundle, p, c, mergedProgress]) => {
        setStats(s);
        setBadges(badgeBundle.unlocked);
        setAllBadges(badgeBundle.all);
        setPaths(p);
        setChallenge(c);
        const byId: Record<number, 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED'> = {};
        for (const row of mergedProgress) {
          byId[row.trickId] = row.status;
        }
        setProgressByTrickId(byId);
      })
      .catch(() =>
        setError(
          isOnline
            ? 'Impossible de charger les données. Veuillez réessayer.'
            : 'Données limitées hors-ligne. Active le préchargement depuis Profil.',
        ),
      )
      .finally(() => setLoading(false));
  }, [user?.id, isOnline]);

  const challengeCtaLabel = challenge?.trickId
    ? 'Commencer'
    : 'Explorer';

  const handleChallengeStart = async () => {
    if (challenge?.trickId) {
      navigate(`/student/trick/${challenge.trickId}`);
      return;
    }
    if (challenge?.trickName) {
      const { loadCatalogueSnapshot } = await import('../../utils/offlineCatalogueStore');
      const { findTrickIdByName } = await import('../../utils/catalogueTrickLookup');
      const snap = await loadCatalogueSnapshot();
      const pool = [...(snap?.tricks ?? []), ...(snap?.popular ?? [])];
      const id = findTrickIdByName(challenge.trickName, pool);
      if (id != null) {
        navigate(`/student/trick/${id}`);
        return;
      }
    }
    navigate('/student/catalogue');
  };

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
            type="button"
            onClick={logout}
            className="jf-btn-secondary jf-btn-secondary-sm"
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
        <OfflineBanner />

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
            {/* ── Défi du jour (wireframes) ── */}
            {challenge ? (
              <section>
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                  Défi du jour
                </h2>
                <div className="p-4 rounded-2xl bg-bg-card border border-border flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-text-primary text-sm truncate">{challenge.title}</p>
                    <p className="text-xs text-text-muted mt-1 line-clamp-2">
                      {challenge.description}
                    </p>
                    {challenge.targetValue && challenge.targetUnit && (
                      <p className="text-[0.65rem] text-brand-end font-semibold mt-1">
                        Objectif : {challenge.targetValue} {challenge.targetUnit}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleChallengeStart}
                    className="jf-btn-primary jf-btn-primary-sm shrink-0 min-h-11 rounded-xl px-4 py-2 text-xs"
                  >
                    {challengeCtaLabel}
                  </button>
                </div>
              </section>
            ) : null}

            {/* ── Parcours en cours ── */}
            {currentPath ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                    Parcours en cours
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/student/parcours/${currentPath.id}`)}
                    className="text-xs text-brand-end underline underline-offset-2 hover:opacity-80"
                  >
                    Détail →
                  </button>
                </div>
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
                  <PathTrickList path={currentPath} progressByTrickId={progressByTrickId} />
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                  Badges récents
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/student/badges')}
                  className="text-xs text-brand-end underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Voir tous →
                </button>
              </div>
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
                  className="jf-btn-secondary jf-btn-secondary-sm shrink-0 min-h-11 rounded-xl px-4 py-2 text-xs"
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