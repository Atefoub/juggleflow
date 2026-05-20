import { useEffect, useState } from 'react';
import BottomNav from '../../components/BottomNav';
import AppIcon from '../../components/icons/AppIcon';
import type { IconName } from '../../components/icons/iconRegistry';
import { STUDENT_NAV_ITEMS } from '../../config/studentNav';
import ProgressBar from '../../components/ProgressBar';
import OfflineBanner from '../../components/OfflineBanner';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import {
  getStudentBadges,
  getStudentProgress,
  getStudentStatistics,
} from '../../api/studentOffline';
import type { BadgeData, StudentStats, TrickProgress } from '../../api/studentApi';
import { mergePendingIntoProgress } from '../../utils/offlineQueue';

const XP_PER_TRICK = 100;
const XP_MAX       = 500;
const RANK_LABEL   = 'Bronze';
const RANK_NEXT    = 'Argent';

const STREAK_BADGES: { id: string; icon: IconName; label: string; requirement: number }[] = [
  { id: 's1', icon: 'badge-streak-7', label: '7 jours', requirement: 7 },
  { id: 's2', icon: 'badge-streak-30', label: '30 jours', requirement: 30 },
  { id: 's3', icon: 'badge-streak-100', label: '100 jours', requirement: 100 },
];

const MILESTONE_BADGES: { id: string; icon: IconName; label: string; requirement: number }[] = [
  { id: 'm1', icon: 'badge-mastery-10', label: '10 figures', requirement: 10 },
  { id: 'm2', icon: 'badge-mastery-25', label: '25 figures', requirement: 25 },
  { id: 'm3', icon: 'badge-mastery-50', label: '50 figures', requirement: 50 },
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

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
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);

  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function BadgeItem({ icon, label, unlocked, iconLabel }: {
  icon: IconName; label: string; unlocked: boolean; iconLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={[
        'flex items-center justify-center w-16 h-16 rounded-2xl transition-opacity',
        unlocked ? 'bg-linear-to-br from-brand to-brand-end text-white' : 'bg-border opacity-40 text-text-muted',
      ].join(' ')}>
        <AppIcon
          name={unlocked ? icon : 'status-locked'}
          size={32}
          label={iconLabel ?? (unlocked ? label : 'verrouillé')}
        />
      </div>
      <span className={`text-[0.65rem] text-center leading-tight max-w-15 ${unlocked ? 'text-text-primary' : 'text-text-muted'}`}>
        {label}
      </span>
    </div>
  );
}

export default function BadgesPage() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [badges, setBadges]       = useState<BadgeData[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [stats, setStats]         = useState<StudentStats | null>(null);
  const [progress, setProgress]   = useState<TrickProgress[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      getStudentBadges(isOnline, user.id),
      getStudentStatistics(isOnline, user.id),
      getStudentProgress(isOnline, user.id).then((p) => mergePendingIntoProgress(user.id, p)),
    ])
      .then(([badgeBundle, s, p]) => {
        setBadges(badgeBundle.unlocked);
        setAllBadges(badgeBundle.all);
        setStats(s);
        setProgress(p);
      })
      .catch(() =>
        setError(
          isOnline
            ? 'Impossible de charger les badges.'
            : 'Badges non disponibles hors-ligne. Précharge le contenu depuis Profil.',
        ),
      )
      .finally(() => setLoading(false));
  }, [user?.id, isOnline]);

  const unlockedIds = new Set(badges.map((b) => b.id));
  const levelBadges = [
    ...badges,
    ...allBadges.filter((b) => !unlockedIds.has(b.id)),
  ];

  const xp = (stats?.totalTricksLearned ?? 0) * XP_PER_TRICK;
  const xpDisplay = Math.min(xp, XP_MAX);
  const streakDays = computeStreakFromProgress(progress);
  const masteredCount = stats?.totalTricksLearned ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header XP */}
      <header className="px-5 pt-12 pb-5 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-4">Badges &amp; Succès</h1>

        {/* XP Card */}
        <div className="p-4 rounded-2xl bg-bg-card border border-border">
          <div className="flex items-end justify-between mb-3">
            <div>
                <p className="text-xs text-text-muted mb-1">Points d'expérience</p>
                <p className="font-display font-bold text-5xl text-text-primary leading-none">{xpDisplay} XP</p>
                <p className="text-xs text-text-muted mt-1">Continue comme ça pour débloquer de nouveaux rangs.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-text-muted">Rang actuel</span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-border">
                <span role="img" aria-label="médaille" className="text-sm">🥉</span>
                <span className="text-xs font-bold text-text-primary">{RANK_LABEL}</span>
              </span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>{RANK_LABEL} · {xpDisplay} XP</span>
            <span>{RANK_NEXT} · {XP_MAX} XP</span>
          </div>
          <ProgressBar
            value={Math.min((xp / XP_MAX) * 100, 100)}
            color="linear-gradient(90deg, #8B2BE2, #C724B1)"
            height="8px"
          />
          <p className="text-xs text-text-muted mt-1">{Math.max(0, XP_MAX - xpDisplay)} XP pour atteindre le rang {RANK_NEXT}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">
        <OfflineBanner className="mb-1" />

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl animate-pulse bg-bg-card" />)}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Level badges */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                  Badges de niveau
                </h2>
                <span className="text-xs text-text-muted">{badges.length} / {allBadges.length}</span>
              </div>
              {levelBadges.length === 0 ? (
                <p className="text-xs text-text-muted p-3">Aucun badge disponible.</p>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {levelBadges.map((badge) => (
                    <BadgeItem
                      key={badge.id}
                      icon={badge.iconUrl ? '' : '🏅'}
                      label={badge.name}
                      unlocked={unlockedIds.has(badge.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Streak badges */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Badges de régularité
              </h2>
              <div className="flex gap-4 mb-3">
                {STREAK_BADGES.map((b) => {
                  const isUnlocked = streakDays >= b.requirement;
                  return (
                    <BadgeItem key={b.id} icon={b.icon} label={b.label} unlocked={isUnlocked} />
                  );
                })}
              </div>
              <div className="p-3 rounded-xl bg-bg-card border border-border">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-text-secondary">Streak actuel</span>
                  <span className="text-xs font-bold text-brand-end">{Math.min(streakDays, 30)} / 30 jours</span>
                </div>
                <ProgressBar value={Math.min((streakDays / 30) * 100, 100)} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="6px" />
              </div>
            </section>

            {/* Milestone badges */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Badges jalons
              </h2>
              <div className="flex gap-4 mb-3">
                {MILESTONE_BADGES.map((b) => {
                  const isUnlocked = masteredCount >= b.requirement;
                  return (
                    <BadgeItem key={b.id} icon={b.icon} label={b.label} unlocked={isUnlocked} />
                  );
                })}
              </div>
              <div className="p-3 rounded-xl bg-bg-card border border-border">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-text-secondary">Figures maîtrisées</span>
                  <span className="text-xs text-success font-bold">{Math.min(masteredCount, 25)} / 25</span>
                </div>
                <ProgressBar value={Math.min((masteredCount / 25) * 100, 100)} color="#22C55E" height="6px" />
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  );
}