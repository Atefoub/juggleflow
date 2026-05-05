import { useEffect, useState } from 'react';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { studentApi, type BadgeData } from '../../api/studentApi';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

const XP_CURRENT = 240;
const XP_MAX     = 500;
const RANK_LABEL = 'Bronze';
const RANK_NEXT  = 'Argent';

const STREAK_BADGES = [
  { id: 's1', icon: '🔥', label: '7 jours',   requirement: 7,   unlocked: true  },
  { id: 's2', icon: '⚡', label: '30 jours',  requirement: 30,  unlocked: false },
  { id: 's3', icon: '💎', label: '100 jours', requirement: 100, unlocked: false },
];

const MILESTONE_BADGES = [
  { id: 'm1', icon: '🌱', label: '10 figures', requirement: 10, unlocked: true  },
  { id: 'm2', icon: '🌿', label: '25 figures', requirement: 25, unlocked: false },
  { id: 'm3', icon: '🌳', label: '50 figures', requirement: 50, unlocked: false },
];

function BadgeItem({ icon, label, unlocked, iconLabel }: {
  icon: string; label: string; unlocked: boolean; iconLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={[
        'flex items-center justify-center w-16 h-16 rounded-2xl text-2xl transition-opacity',
        unlocked ? 'bg-linear-to-br from-brand to-brand-end' : 'bg-border opacity-40',
      ].join(' ')}>
        <span role="img" aria-label={iconLabel ?? (unlocked ? label : 'verrouillé')}>
          {unlocked ? icon : '🔒'}
        </span>
      </div>
      <span className={`text-[0.65rem] text-center leading-tight max-w-[60px] ${unlocked ? 'text-text-primary' : 'text-text-muted'}`}>
        {label}
      </span>
    </div>
  );
}

export default function BadgesPage() {
  const [badges, setBadges]       = useState<BadgeData[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([studentApi.getUnlockedBadges(), studentApi.getAllBadges()])
      .then(([unlocked, all]) => { setBadges(unlocked); setAllBadges(all); })
      .catch(() => setError('Impossible de charger les badges.'))
      .finally(() => setLoading(false));
  }, []);

  const unlockedIds = new Set(badges.map((b) => b.id));
  const levelBadges = [
    ...badges,
    ...allBadges.filter((b) => !unlockedIds.has(b.id)),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header XP */}
      <header className="px-5 pt-12 pb-5 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-4">Badges &amp; Succès</h1>

        {/* XP Card */}
        <div className="p-4 rounded-2xl bg-bg-card border border-border">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-text-muted mb-1">Progression moyenne</p>
              <p className="font-display font-bold text-5xl text-text-primary leading-none">{XP_CURRENT} XP</p>
              <p className="text-xs text-success mt-1">↑ +5% vs semaine dernière</p>
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
            <span>{RANK_LABEL} · {XP_CURRENT} XP</span>
            <span>{RANK_NEXT} · {XP_MAX} XP</span>
          </div>
          <ProgressBar
            value={Math.min((XP_CURRENT / XP_MAX) * 100, 100)}
            color="linear-gradient(90deg, #8B2BE2, #C724B1)"
            height="8px"
          />
          <p className="text-xs text-text-muted mt-1">{XP_MAX - XP_CURRENT} XP pour atteindre le rang {RANK_NEXT}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">

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
                {STREAK_BADGES.map((b) => (
                  <BadgeItem key={b.id} icon={b.icon} label={b.label} unlocked={b.unlocked} />
                ))}
              </div>
              <div className="p-3 rounded-xl bg-bg-card border border-border">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-text-secondary">Streak actuel</span>
                  <span className="text-xs text-cta font-bold">7 / 30 jours</span>
                </div>
                <ProgressBar value={(7 / 30) * 100} color="#FF7A00" height="6px" />
              </div>
            </section>

            {/* Milestone badges */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Badges jalons
              </h2>
              <div className="flex gap-4 mb-3">
                {MILESTONE_BADGES.map((b) => (
                  <BadgeItem key={b.id} icon={b.icon} label={b.label} unlocked={b.unlocked} />
                ))}
              </div>
              <div className="p-3 rounded-xl bg-bg-card border border-border">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-text-secondary">Figures maîtrisées</span>
                  <span className="text-xs text-success font-bold">12 / 25</span>
                </div>
                <ProgressBar value={(12 / 25) * 100} color="#22C55E" height="6px" />
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}