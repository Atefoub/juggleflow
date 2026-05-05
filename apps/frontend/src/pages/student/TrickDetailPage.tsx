import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { catalogueApi, LEVEL_LABELS, scoreToStars, type TrickResponse } from '../../api/catalogueApi';
import { studentApi, type TrickProgress } from '../../api/studentApi';

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

type Tab = 'description' | 'conseils' | 'prerequis';
type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

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

  const [trick, setTrick]             = useState<TrickResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [tab, setTab]                 = useState<Tab>('description');
  const [status, setStatus]           = useState<ProgressStatus>('NOT_STARTED');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const trickId = Number(id);
    if (Number.isNaN(trickId)) {
      setError('Identifiant de figure invalide.');
      setLoading(false);
      return;
    }
    catalogueApi
      .getTrickById(trickId)
      .then(setTrick)
      .catch(() => setError('Impossible de charger cette figure.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const trickId = Number(id);
    if (Number.isNaN(trickId)) return;

    studentApi
      .getMyProgress()
      .then((progress: TrickProgress[]) => {
        const p = progress.find((x) => x.trickId === trickId);
        if (p?.status) setStatus(p.status);
      })
      .catch(() => {
        // silencieux : la page reste fonctionnelle même si la progression ne charge pas
      });
  }, [id]);

  const level      = trick?.levelName ?? 'Beginner';
  const xp         = XP_BY_LEVEL[level] ?? 100;
  const xpPercent  = Math.min((xp / XP_NEXT) * 100, 100);
  const levelLabel = LEVEL_LABELS[level] ?? level;
  const chipClass  = LEVEL_CHIP[level] ?? LEVEL_CHIP.Beginner;

  async function handleSetStatus(newStatus: ProgressStatus) {
    if (!trick) return;
    setSavingStatus(true);
    setStatusError(null);
    try {
      await studentApi.updateProgress(trick.id, {
        status: newStatus,
        masteryScore: newStatus === 'MASTERED' ? 10 : undefined,
      });
      setStatus(newStatus);
    } catch {
      setStatusError('Impossible de sauvegarder. Réessaie.');
    } finally {
      setSavingStatus(false);
    }
  }

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

            {/* Status actuel */}
            {status !== 'NOT_STARTED' && (
              <div className={[
                'flex items-center gap-2 p-3 rounded-xl text-sm font-semibold',
                status === 'MASTERED'    ? 'bg-success/10 border border-success/30 text-success' :
                status === 'IN_PROGRESS' ? 'bg-cta/10     border border-cta/30     text-cta'     : '',
              ].join(' ')}>
                <span>{status === 'MASTERED' ? '✅' : '🔄'}</span>
                <span>{status === 'MASTERED' ? 'Figure maîtrisée !' : 'Apprentissage en cours'}</span>
              </div>
            )}

            {/* Session button */}
            <button
              onClick={() => handleSetStatus('IN_PROGRESS')}
              disabled={status === 'MASTERED' || savingStatus}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white bg-linear-to-br from-brand to-brand-end min-h-11 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <span role="img" aria-label="chronomètre">⏱️</span>
              {status === 'IN_PROGRESS' ? 'Continuer la session' : 'Démarrer une session'}
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
                  {trick.estimatedLearningDuration && (
                    <div className="flex gap-3 p-3 rounded-xl bg-bg-card border border-border">
                      <span role="img" aria-label="durée" className="text-lg shrink-0">⏱️</span>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        Durée d'apprentissage estimée : <strong className="text-text-primary">{trick.estimatedLearningDuration} minutes</strong> de pratique.
                      </p>
                    </div>
                  )}
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

            {/* Erreur sauvegarde */}
            {statusError && (
              <div className="p-3 rounded-xl text-xs text-alert bg-[#2A1020] border border-alert">
                {statusError}
              </div>
            )}

            {/* Boutons de statut */}
            <section className="flex flex-col gap-3">
              <button
                onClick={() => handleSetStatus('MASTERED')}
                disabled={status === 'MASTERED' || savingStatus}
                className={[
                  'w-full py-3 rounded-2xl text-sm font-semibold min-h-11 transition-opacity',
                  status === 'MASTERED'
                    ? 'bg-success/20 text-success border border-success/40 cursor-default'
                    : 'bg-linear-to-br from-brand to-brand-end text-white hover:opacity-90',
                ].join(' ')}
              >
                {savingStatus ? 'Sauvegarde…' : status === 'MASTERED' ? '✅ Figure maîtrisée !' : 'Marquer comme maîtrisée'}
              </button>
              {status !== 'IN_PROGRESS' && status !== 'MASTERED' && (
                <button
                  onClick={() => handleSetStatus('IN_PROGRESS')}
                  disabled={savingStatus}
                  className="w-full py-3 rounded-2xl text-sm font-semibold border border-border text-text-secondary bg-bg-card min-h-11 hover:opacity-80 transition-opacity disabled:opacity-50"
                >
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
