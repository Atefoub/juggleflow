import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import AppIcon from '../../components/icons/AppIcon';
import ProgressStatusIcon from '../../components/icons/ProgressStatusIcon';
import {
  ONBOARDING_LEVEL_ICON,
  type IconName,
} from '../../components/icons/iconRegistry';
import { STUDENT_NAV_ITEMS } from '../../config/studentNav';
import ProgressBar from '../../components/ProgressBar';
import { getOnboardingLevel, ONBOARDING_LEVEL_LABELS } from '../../utils/onboarding';
import OfflineBanner from '../../components/OfflineBanner';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getStudentBadges, getStudentProgress, getStudentStatistics } from '../../api/studentOffline';
import type { StudentStats, BadgeData, TrickProgress } from '../../api/studentApi';
import { mergePendingIntoProgress } from '../../utils/offlineQueue';
import { PROGRESS_UPDATED_EVENT } from '../../lib/progressEvents';

const XP_PER_TRICK = 100;
const XP_MAX = 500;

const STREAK_BADGES: { id: string; name: string; icon: IconName; requirement: number }[] = [
  { id: 's1', name: '7 jours', icon: 'badge-streak-7', requirement: 7 },
  { id: 's2', name: '30 jours', icon: 'badge-streak-30', requirement: 30 },
  { id: 's3', name: '100 jours', icon: 'badge-streak-100', requirement: 100 },
];

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

const STATUS_BADGE: Record<ProgressStatus, { label: string; cls: string }> = {
  MASTERED: {
    label: 'Maîtrisée',
    cls: 'bg-success/10 text-success border border-success/30',
  },
  IN_PROGRESS: {
    label: 'En cours',
    cls: 'bg-brand/10 text-brand-end border border-brand/30',
  },
  NOT_STARTED: {
    label: 'Non commencée',
    cls: 'bg-border/40 text-text-muted border border-border',
  },
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Calcule le streak (jours consécutifs) à partir des dates d'activité.
 * On considère qu'une activité existe si au moins une figure a été mise à jour ce jour-là.
 */
function computeStreakFromProgress(progress: TrickProgress[]): number {
  const days = new Set<string>();
  for (const p of progress) {
    if (!p.updatedAt) continue;
    const date = new Date(p.updatedAt);
    if (Number.isNaN(date.getTime())) continue;
    days.add(dayKey(date));
  }

  if (days.size === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  // Si aucune activité aujourd'hui, on commence à hier (streak "en cours" jusqu'au dernier jour actif).
  if (!days.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export default function ProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const [stats, setStats]         = useState<StudentStats | null>(null);
  const [badges, setBadges]       = useState<BadgeData[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [trickProgress, setTrickProgress] = useState<TrickProgress[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      getStudentStatistics(isOnline, user.id),
      getStudentBadges(isOnline, user.id),
      getStudentProgress(isOnline, user.id).then((p) =>
        mergePendingIntoProgress(user.id, p),
      ),
    ])
      .then(([s, badgeBundle, progress]) => {
        setStats(s);
        setBadges(badgeBundle.unlocked);
        setAllBadges(badgeBundle.all);
        setTrickProgress(progress);
      })
      .catch(() =>
        setError(
          isOnline
            ? 'Impossible de charger votre progression. Veuillez réessayer.'
            : 'Progression en cache indisponible. Précharge le contenu depuis Profil.',
        ),
      )
      .finally(() => setLoading(false));
  }, [user?.id, isOnline]);

  useEffect(() => {
    const handler = (evt: Event) => {
      const { detail } = evt as CustomEvent<{ trickId: number; status: ProgressStatus }>;
      if (!detail?.trickId || !detail.status) return;
      setTrickProgress((prev) => prev.map((p) => (
        p.trickId === detail.trickId
          ? { ...p, status: detail.status, updatedAt: new Date().toISOString() }
          : p
      )));
    };
    window.addEventListener(PROGRESS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PROGRESS_UPDATED_EVENT, handler);
  }, []);

  const xp        = (stats?.totalTricksLearned ?? 0) * XP_PER_TRICK;
  const xpPercent = Math.min((xp / XP_MAX) * 100, 100);
  const xpDisplay = Math.min(xp, XP_MAX);

  const onboardingLevel = getOnboardingLevel(user?.id) ?? 'BEGINNER';

  const unlockedIds = new Set(badges.map((b) => b.id));
  const badgeGrid = [
    ...badges,
    ...allBadges.filter((b) => !unlockedIds.has(b.id)),
  ];

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  const sortedTrickProgress = useMemo(() => {
    const rank: Record<ProgressStatus, number> = { IN_PROGRESS: 0, MASTERED: 1, NOT_STARTED: 2 };
    return [...trickProgress].sort((a, b) => {
      const ra = rank[a.status];
      const rb = rank[b.status];
      if (ra !== rb) return ra - rb;
      return a.trickName.localeCompare(b.trickName, 'fr');
    });
  }, [trickProgress]);

  // Préférence : streak calculé côté backend (table user_streak). Fallback sur le calcul
  // client (heuristique basée sur les dates de progression) si le backend ne renvoie rien.
  const streakDays = useMemo(() => {
    if (typeof stats?.currentStreakDays === 'number') return stats.currentStreakDays;
    return computeStreakFromProgress(trickProgress);
  }, [stats?.currentStreakDays, trickProgress]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-5 bg-bg-header border-b border-border">
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
              <AppIcon
                name={ONBOARDING_LEVEL_ICON[onboardingLevel]}
                size={22}
                label={`Niveau ${ONBOARDING_LEVEL_LABELS[onboardingLevel]}`}
              />
              <div>
                <p className="text-xs text-text-muted">Niveau actuel</p>
                <p className="font-display font-bold text-text-primary text-sm">
                  {ONBOARDING_LEVEL_LABELS[onboardingLevel]}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Points XP</p>
              <p className="font-display font-bold text-brand text-sm">{xpDisplay} / {XP_MAX}</p>
            </div>
          </div>
          <ProgressBar value={xpPercent} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="8px" />
          <p className="text-xs text-text-muted mt-1">
            {Math.max(0, XP_MAX - xpDisplay)} XP pour le niveau suivant
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <OfflineBanner />

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-alert-surface border border-alert">
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
                {([
                  { value: stats?.totalTricksLearned ?? 0, label: 'Figures\napprises', iconName: 'status-mastered' as IconName, iconLabel: 'figures apprises' },
                  { value: stats?.tricksInProgress   ?? 0, label: 'En\nprogression', iconName: 'inline-in-progress' as IconName, iconLabel: 'en progression' },
                  { value: stats?.badgesEarned        ?? 0, label: 'Badges\nobtenus', iconName: 'badge-mastery-10' as IconName, iconLabel: 'badges obtenus' },
                ]).map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
                  >
                    <AppIcon name={stat.iconName} size={18} label={stat.iconLabel} />
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
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">
                    {badges.length} / {allBadges.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/student/badges')}
                    className="text-xs text-brand-end underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Voir tous →
                  </button>
                </div>
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
                            <AppIcon
                              name={isUnlocked ? 'badge-mastery-10' : 'status-locked'}
                              size={28}
                              label={isUnlocked ? 'badge débloqué' : 'badge verrouillé'}
                            />
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
                  <AppIcon name="badge-streak-7" size={16} label="série" />
                  <span className="text-xs font-bold text-brand-end">{streakDays} jours</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {STREAK_BADGES.map((badge) => {
                  const isUnlocked = streakDays >= badge.requirement;
                  return (
                    <div key={badge.id} className="flex flex-col items-center gap-2">
                      <div
                        className={[
                          'flex items-center justify-center w-14 h-14 rounded-xl text-2xl',
                          isUnlocked
                            ? 'border border-brand bg-accent-surface'
                            : 'bg-border opacity-40',
                        ].join(' ')}
                      >
                        <AppIcon
                          name={isUnlocked ? badge.icon : 'status-locked'}
                          size={28}
                          label={badge.name}
                        />
                      </div>
                      <span
                        className={[
                          'text-[0.6rem] text-center leading-tight',
                          isUnlocked ? 'text-brand-end' : 'text-text-muted',
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
                    {streakDays} / {STREAK_BADGES[STREAK_BADGES.length - 1].requirement} jours
                  </span>
                </div>
                <ProgressBar
                  value={Math.min((streakDays / STREAK_BADGES[STREAK_BADGES.length - 1].requirement) * 100, 100)}
                  color="linear-gradient(90deg, #8B2BE2, #C724B1)"
                  height="6px"
                />
              </div>
            </section>

            {/* Détail par figure */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                  Détail par figure
                </h2>
                <span className="text-xs text-text-muted">
                  {sortedTrickProgress.length} figure{sortedTrickProgress.length !== 1 ? 's' : ''}
                </span>
              </div>

              {sortedTrickProgress.length === 0 ? (
                <div className="p-4 rounded-2xl bg-bg-card border border-border text-xs text-text-muted text-center">
                  Aucune progression à afficher pour le moment.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sortedTrickProgress.map((p) => {
                    const badge = STATUS_BADGE[p.status];
                    return (
                      <button
                        key={p.trickId}
                        type="button"
                        onClick={() => navigate(`/student/trick/${p.trickId}`)}
                        className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl bg-bg-card border border-border hover:opacity-90 transition-opacity"
                        aria-label={`Voir la figure ${p.trickName}`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-sm truncate">{p.trickName}</p>
                          <p className="text-[0.6rem] text-text-muted">
                            {p.updatedAt ? `Mis à jour : ${new Date(p.updatedAt).toLocaleDateString('fr-FR')}` : '—'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 shrink-0 text-[0.55rem] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          <ProgressStatusIcon status={p.status} size={12} />
                          {badge.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  );
}