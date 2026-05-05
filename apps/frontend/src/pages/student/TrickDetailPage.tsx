import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { catalogueApi, LEVEL_LABELS, scoreToStars, type TrickResponse } from '../../api/catalogueApi';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

const LEVEL_CHIP: Record<string, string> = {
  Beginner:     'text-success  bg-success/10  border border-success/30',
  Intermediate: 'text-cta      bg-cta/10      border border-cta/30',
  Advanced:     'text-brand    bg-brand/10    border border-brand/30',
  Expert:       'text-alert    bg-alert/10    border border-alert/30',
};

const XP_BY_LEVEL: Record<string, number> = {
  Beginner: 100, Intermediate: 200, Advanced: 350, Expert: 500,
};
const XP_NEXT = 500;

// Static badge data displayed on this page (visual only — not from API)
const BADGE_GROUPS = [
  {
    title: 'Badges de niveau',
    badges: [
      { id: 'b1', icon: '🥉', label: 'Premiers pas', unlocked: true  },
      { id: 'b2', icon: '🎯', label: 'Précision',    unlocked: false },
      { id: 'b3', icon: '🏆', label: 'Champion',     unlocked: false },
    ],
  },
  {
    title: 'Badges de régularité',
    badges: [
      { id: 'b4', icon: '🔥', label: '7 jours',   unlocked: true  },
      { id: 'b5', icon: '⚡', label: '30 jours',  unlocked: false },
      { id: 'b6', icon: '💎', label: '100 jours', unlocked: false },
    ],
  },
  {
    title: 'Badges jalons',
    badges: [
      { id: 'b7', icon: '🌱', label: '10 figures', unlocked: true  },
      { id: 'b8', icon: '🌿', label: '25 figures', unlocked: false },
      { id: 'b9', icon: '🌳', label: '50 figures', unlocked: false },
    ],
  },
];

type Tab = 'description' | 'conseils' | 'prerequis';

function StarRating({ score }: { score: number }) {
  const stars = scoreToStars(score);
  return (
    <span className="flex gap-0.5" aria-label={`Difficulté : ${score} sur 10`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < stars ? 'text-cta text-sm' : 'text-border text-sm'}>★</span>
      ))}
    </span>
  );
}

export default function TrickDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trick, setTrick]   = useState<TrickResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tab, setTab]         = useState<Tab>('description');
  const [mastered, setMastered] = useState(false);

  useEffect(() => {
    if (!id) return;
    catalogueApi
      .getTrickById(Number(id))
      .then(setTrick)
      .catch(() => setError('Impossible de charger cette figure.'))
      .finally(() => setLoading(false));
  }, [id]);

  const level      = trick?.levelName ?? 'Beginner';
  const xp         = XP_BY_LEVEL[level] ?? 100;
  const xpPercent  = Math.min((xp / XP_NEXT) * 100, 100);
  const levelLabel = LEVEL_LABELS[level] ?? level;
  const chipClass  = LEVEL_CHIP[level] ?? LEVEL_CHIP.Beginner;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour au catalogue"
          className="flex items-center gap-1 text-xs text-text-muted mb-4 hover:text-text-secondary transition-colors"
        >
          ← Retour
        </button>

        {loading ? (
          <div className="h-10 rounded-xl animate-pulse bg-bg-card" />
        ) : trick ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-text-primary text-xl leading-tight">
                {trick.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${chipClass}`}>
                  {levelLabel}
                </span>
                <StarRating score={trick.difficultyScore} />
              </div>
            </div>
            {trick.siteswap && (
              <span className="text-xs px-2 py-1 rounded-lg bg-bg-card border border-border text-text-muted shrink-0">
                {trick.siteswap}
              </span>
            )}
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse bg-bg-card" />
            ))}
          </div>
        )}

        {!loading && !error && trick && (
          <>
            {/* Animation Juggling Lab */}
            <section>
              {trick.jugglingLabAnimationUrl ? (
                <div className="rounded-2xl overflow-hidden bg-bg-card border border-border">
                  <iframe
                    src={trick.jugglingLabAnimationUrl}
                    title={`Animation ${trick.name}`}
                    className="w-full h-48 border-none"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-bg-card border border-border h-48 flex flex-col items-center justify-center gap-2">
                  <span role="img" aria-label="jonglage" className="text-4xl">🤹</span>
                  <p className="text-xs text-text-muted">Animation non disponible</p>
                </div>
              )}
            </section>

            {/* Session button */}
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white bg-linear-to-br from-brand to-brand-end min-h-11 hover:opacity-90 transition-opacity">
              <span role="img" aria-label="chronomètre">⏱️</span>
              Démarrer une session
            </button>

            {/* XP & Rank */}
            <section className="p-4 rounded-2xl bg-bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Points d'expérience</p>
                  <p className="font-display font-bold text-3xl text-text-primary">{xp} XP</p>
                  <p className="text-xs text-text-muted mt-0.5">Rang : Bronze</p>
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-full border-4 border-cta shrink-0">
                  <span role="img" aria-label="médaille bronze" className="text-2xl">🥉</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>Bronze · {xp} XP</span>
                <span>Argent · {XP_NEXT} XP</span>
              </div>
              <ProgressBar value={xpPercent} color="linear-gradient(90deg, #FF7A00, #FFB347)" height="6px" />
              <p className="text-xs text-text-muted mt-1">{XP_NEXT - xp} XP pour atteindre le rang Argent</p>
            </section>

            {/* Tabs */}
            <section>
              <div className="flex rounded-xl bg-bg-card border border-border overflow-hidden mb-4">
                {(['description', 'conseils', 'prerequis'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={[
                      'flex-1 py-2.5 text-xs font-semibold capitalize transition-colors',
                      tab === t
                        ? 'bg-brand text-white'
                        : 'text-text-muted hover:text-text-secondary',
                    ].join(' ')}
                  >
                    {t === 'prerequis' ? 'Prérequis' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {tab === 'description' && (
                <p className="text-sm text-text-secondary leading-relaxed">
                  {trick.description || 'Aucune description disponible pour cette figure.'}
                </p>
              )}

              {tab === 'conseils' && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3 p-3 rounded-xl bg-bg-card border border-border">
                    <span role="img" aria-label="conseil" className="text-lg shrink-0">💡</span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Lance toujours la 3ème balle au moment où la 2ème atteint son sommet.
                    </p>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-bg-card border border-border">
                    <span role="img" aria-label="astuce" className="text-lg shrink-0">🎯</span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Garde les yeux fixés sur le point le plus haut de la trajectoire.
                    </p>
                  </div>
                </div>
              )}

              {tab === 'prerequis' && (
                <div className="flex flex-col gap-2">
                  {trick.prerequisiteNames.length === 0 ? (
                    <p className="text-sm text-text-muted">Aucun prérequis — figure accessible à tous !</p>
                  ) : (
                    trick.prerequisiteNames.map((name) => (
                      <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-border">
                        <span role="img" aria-label="prérequis" className="text-lg">✅</span>
                        <span className="text-sm text-text-primary">{name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>

            {/* Badges */}
            {BADGE_GROUPS.map((group) => (
              <section key={group.title}>
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                  {group.title}
                </h2>
                <div className="flex gap-4">
                  {group.badges.map((badge) => (
                    <div key={badge.id} className="flex flex-col items-center gap-2">
                      <div
                        className={[
                          'flex items-center justify-center w-14 h-14 rounded-xl text-2xl',
                          badge.unlocked
                            ? 'bg-linear-to-br from-brand to-brand-end'
                            : 'bg-border opacity-40',
                        ].join(' ')}
                      >
                        <span role="img" aria-label={badge.unlocked ? badge.label : 'verrouillé'}>
                          {badge.unlocked ? badge.icon : '🔒'}
                        </span>
                      </div>
                      <span className={`text-[0.6rem] text-center ${badge.unlocked ? 'text-text-primary' : 'text-text-muted'}`}>
                        {badge.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Mark as mastered */}
            <section className="flex flex-col gap-3">
              <button
                onClick={() => setMastered(true)}
                disabled={mastered}
                className={[
                  'w-full py-3 rounded-2xl text-sm font-semibold min-h-11 transition-opacity',
                  mastered
                    ? 'bg-success/20 text-success border border-success/40 cursor-default'
                    : 'bg-linear-to-br from-brand to-brand-end text-white hover:opacity-90',
                ].join(' ')}
              >
                {mastered ? '✅ Figure maîtrisée !' : 'Marquer comme maîtrisée'}
              </button>
              {!mastered && (
                <button className="w-full py-3 rounded-2xl text-sm font-semibold border border-border text-text-secondary bg-bg-card min-h-11 hover:opacity-80 transition-opacity">
                  Marquer en cours
                </button>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}