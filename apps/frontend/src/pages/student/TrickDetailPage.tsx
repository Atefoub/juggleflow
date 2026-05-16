import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { getTrickDetail } from '../../api/catalogueOffline';
import { LEVEL_LABELS, scoreToStars, type TrickResponse } from '../../api/catalogueApi';
import { studentApi, type TrickProgress } from '../../api/studentApi';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuth } from '../../context/AuthContext';
import { enqueueProgressUpdate } from '../../utils/offlineQueue';
import OfflineBanner from '../../components/OfflineBanner';
import { resolveTrickAnimation } from '../../utils/jugglingLab';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

const LEVEL_CHIP: Record<string, string> = {
  Beginner:     'text-success  bg-success/10  border border-success/30',
  Intermediate: 'text-brand-end bg-brand/12  border border-brand/35',
  Advanced:     'text-brand    bg-brand/10    border border-brand/30',
  Expert:       'text-alert    bg-alert/10    border border-alert/30',
};

const XP_BY_LEVEL: Record<string, number> = {
  Beginner: 100, Intermediate: 200, Advanced: 350, Expert: 500,
};
const XP_NEXT = 500;

type Tab = 'description' | 'conseils' | 'prerequis';
type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

const PROGRESS_UPDATED_EVENT = 'juggleflow:progress-updated';

function StarRating({ score }: { score: number }) {
  const stars = scoreToStars(score);
  return (
    <span className="flex gap-0.5" aria-label={`Difficulté : ${score} sur 10`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < stars ? 'text-brand-end text-sm' : 'text-border text-sm'}>★</span>
      ))}
    </span>
  );
}

export default function TrickDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { user } = useAuth();

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
    getTrickDetail(isOnline, trickId)
      .then(setTrick)
      .catch(() =>
        setError(
          isOnline
            ? 'Impossible de charger cette figure.'
            : 'Figure non disponible hors-ligne. Précharge le catalogue depuis Profil.',
        ),
      )
      .finally(() => setLoading(false));
  }, [id, isOnline]);

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
  const xpDisplay  = Math.min(xp, XP_NEXT);
  const levelLabel = LEVEL_LABELS[level] ?? level;
  const chipClass  = LEVEL_CHIP[level] ?? LEVEL_CHIP.Beginner;

  async function handleSetStatus(newStatus: ProgressStatus) {
    if (!trick) return;
    setSavingStatus(true);
    setStatusError(null);
    try {
      if (!user?.id) return;
      if (!isOnline) {
        enqueueProgressUpdate(user.id, {
          trickId: trick.id,
          status: newStatus,
          masteryScore: newStatus === 'MASTERED' ? 10 : undefined,
        });
      } else {
        await studentApi.updateProgress(trick.id, {
          status: newStatus,
          masteryScore: newStatus === 'MASTERED' ? 10 : undefined,
        });
      }
      setStatus(newStatus);

      window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, {
        detail: { trickId: trick.id, status: newStatus },
      }));
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

        <OfflineBanner message="Hors connexion — cette fiche peut être incomplète si elle n'a pas été consultée auparavant." />

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {!isOnline ? 'Hors connexion. Connecte-toi pour charger la fiche une première fois.' : error}
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
            {/* Animation : URL en base, sinon GIF Juggling Lab dérivé du siteswap (https://jugglinglab.org/) */}
            <section>
              {(() => {
                const anim = resolveTrickAnimation(trick, {
                  width: 400,
                  height: 450,
                  slowdown: 2,
                });
                if (!anim) {
                  return (
                    <div className="rounded-2xl bg-bg-card border border-border h-48 flex flex-col items-center justify-center gap-2">
                      <span role="img" aria-label="jonglage" className="text-4xl">🤹</span>
                      <p className="text-xs text-text-muted">Animation non disponible (pas de siteswap ni d’URL)</p>
                    </div>
                  );
                }
                return (
                  <>
                    <div className="rounded-2xl overflow-hidden bg-bg-card border border-border">
                      {anim.kind === 'iframe' ? (
                        <iframe
                          src={anim.src}
                          title={`Animation ${trick.name}`}
                          className="w-full h-48 border-none"
                          loading="lazy"
                        />
                      ) : (
                        <img
                          src={anim.src}
                          alt={anim.alt}
                          className="w-full max-h-72 object-contain bg-black/30"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    {anim.kind === 'img' && (
                      <p className="text-[0.65rem] text-text-muted mt-2 leading-relaxed">
                        Animation générée par{' '}
                        <a
                          href="https://jugglinglab.org/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-text-secondary hover:text-text-primary"
                        >
                          Juggling Lab
                        </a>
                        {' '}(logiciel libre).{' '}
                        <a
                          href="https://jugglinglab.org/html/ssnotation.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-text-secondary hover:text-text-primary"
                        >
                          Notation siteswap
                        </a>.
                      </p>
                    )}
                  </>
                );
              })()}
            </section>

            {/* Status actuel */}
            {status !== 'NOT_STARTED' && (
              <div className={[
                'flex items-center gap-2 p-3 rounded-xl text-sm font-semibold',
                status === 'MASTERED'    ? 'bg-success/10 border border-success/30 text-success' :
                status === 'IN_PROGRESS' ? 'bg-brand/10 border border-brand/30 text-brand-end' : '',
              ].join(' ')}>
                <span>{status === 'MASTERED' ? '✅' : '🔄'}</span>
                <span>{status === 'MASTERED' ? 'Figure maîtrisée !' : 'Apprentissage en cours'}</span>
              </div>
            )}

            {/* Session button */}
            <button
              onClick={() => navigate(`/student/session/${trick.id}`)}
              disabled={status === 'MASTERED' || savingStatus}
              className="jf-btn-primary w-full min-h-11 rounded-2xl py-3 text-sm disabled:opacity-50"
            >
              <span aria-hidden="true">↗</span>
              <span role="img" aria-label="chronomètre">⏱️</span>
              {status === 'IN_PROGRESS' ? 'Continuer la session' : 'Démarrer une session'}
            </button>

            {/* XP & Rank */}
            <section className="p-4 rounded-2xl bg-bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Points d'expérience</p>
                  <p className="font-display font-bold text-3xl text-text-primary">{xpDisplay} XP</p>
                  <p className="text-xs text-text-muted mt-0.5">Rang : Bronze</p>
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-full border-4 border-brand shrink-0">
                  <span role="img" aria-label="médaille bronze" className="text-2xl">🥉</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>Bronze · {xpDisplay} XP</span>
                <span>Argent · {XP_NEXT} XP</span>
              </div>
              <ProgressBar value={xpPercent} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="6px" />
              <p className="text-xs text-text-muted mt-1">{Math.max(0, XP_NEXT - xpDisplay)} XP pour atteindre le rang Argent</p>
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
                        ? 'bg-linear-to-br from-brand to-brand-end text-white'
                        : 'text-text-muted hover:text-text-secondary',
                    ].join(' ')}
                  >
                    {t === 'description' ? 'Description' : t === 'conseils' ? 'Conseils' : 'Prérequis'}
                  </button>
                ))}
              </div>

              {tab === 'description' && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {trick.description || 'Aucune description disponible pour cette figure.'}
                  </p>
                </div>
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
                  <p className="text-xs text-text-muted">
                    Prérequis avant cette figure :
                  </p>
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
                  'w-full min-h-11 rounded-2xl py-3 text-sm transition-opacity',
                  status === 'MASTERED'
                    ? 'cursor-default border border-success/40 bg-success/20 font-semibold text-success'
                    : 'jf-btn-primary',
                ].join(' ')}
              >
                {savingStatus ? 'Sauvegarde…' : status === 'MASTERED' ? '✅ Figure maîtrisée !' : 'Marquer comme maîtrisée'}
              </button>
              {status !== 'IN_PROGRESS' && status !== 'MASTERED' && (
                <button
                  onClick={() => handleSetStatus('IN_PROGRESS')}
                  disabled={savingStatus}
                  className="jf-btn-secondary w-full min-h-11 rounded-2xl py-3 text-sm disabled:opacity-50"
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
