import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import AppIcon from '../../components/icons/AppIcon';
import { RANK_BADGE_ICON } from '../../components/icons/iconRegistry';
import ProgressStatusIcon from '../../components/icons/ProgressStatusIcon';
import { STUDENT_NAV_ITEMS } from '../../config/studentNav';
import ProgressBar from '../../components/ProgressBar';
import { getTrickDetail } from '../../api/catalogueOffline';
import type { TrickResponse } from '../../api/catalogueApi';
import DifficultyChip from '../../components/catalogue/DifficultyChip';
import StarRating from '../../components/catalogue/StarRating';
import { getStudentProgress } from '../../api/studentOffline';
import { mergePendingIntoProgress } from '../../utils/offlineQueue';
import { studentApi, type TrickProgress } from '../../api/studentApi';
import { dispatchProgressUpdated } from '../../lib/progressEvents';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuth } from '../../context/AuthContext';
import { enqueueProgressUpdate } from '../../utils/offlineQueue';
import OfflineBanner from '../../components/OfflineBanner';
import AnimationPreview from '../../components/catalogue/AnimationPreview';
import { LIBRARY_OF_JUGGLING_BY_TRICK_NAME } from '../../utils/libraryOfJugglingLinks';
import { favoritesApi } from '../../api/favoritesApi';
import {
  getCachedFavoriteIds,
  setCachedFavoriteIds,
} from '../../utils/favoritesStore';

const XP_BY_LEVEL: Record<string, number> = {
  Beginner: 100, Intermediate: 200, Advanced: 350, Expert: 500,
};
const XP_NEXT = 500;

type Tab = 'description' | 'conseils' | 'prerequis';
type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

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
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

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

    if (!user?.id) return;
    getStudentProgress(isOnline, user.id)
      .then((progress) => mergePendingIntoProgress(user.id, progress))
      .then((progress: TrickProgress[]) => {
        const p = progress.find((x) => x.trickId === trickId);
        if (p?.status) setStatus(p.status);
      })
      .catch(() => {
        // silencieux : la page reste fonctionnelle même si la progression ne charge pas
      });
  }, [id, isOnline, user?.id]);

  useEffect(() => {
    if (!id || !user?.id) return;
    const trickId = Number(id);
    if (Number.isNaN(trickId)) return;

    const cached = getCachedFavoriteIds(user.id);
    if (cached.includes(trickId)) {
      setIsFavorite(true);
    }

    if (!isOnline) return;

    favoritesApi
      .listIds()
      .then((ids) => {
        setCachedFavoriteIds(user.id, ids);
        setIsFavorite(ids.includes(trickId));
      })
      .catch(() => { /* silent */ });
  }, [id, isOnline, user?.id]);

  async function toggleFavorite() {
    if (!trick || !user?.id || favoriteBusy) return;
    if (!isOnline) {
      setStatusError('Les favoris nécessitent une connexion internet.');
      return;
    }
    setFavoriteBusy(true);
    setStatusError(null);
    const next = !isFavorite;
    try {
      if (next) {
        await favoritesApi.add(trick.id);
      } else {
        await favoritesApi.remove(trick.id);
      }
      setIsFavorite(next);
      const ids = getCachedFavoriteIds(user.id);
      const updated = next
        ? [...new Set([...ids, trick.id])]
        : ids.filter((x) => x !== trick.id);
      setCachedFavoriteIds(user.id, updated);
    } catch {
      setStatusError('Impossible de mettre à jour les favoris.');
    } finally {
      setFavoriteBusy(false);
    }
  }

  const level      = trick?.levelName ?? 'Beginner';
  const xp         = XP_BY_LEVEL[level] ?? 100;
  const xpPercent  = Math.min((xp / XP_NEXT) * 100, 100);
  const xpDisplay  = Math.min(xp, XP_NEXT);
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

      dispatchProgressUpdated({ trickId: trick.id });
    } catch {
      setStatusError('Impossible de sauvegarder. Réessaie.');
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-bg-header border-b border-border">
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
                <DifficultyChip level={trick.levelName} />
                <StarRating score={trick.difficultyScore} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void toggleFavorite()}
                disabled={favoriteBusy}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className={[
                  'w-10 h-10 rounded-xl border flex items-center justify-center text-lg transition-colors',
                  isFavorite
                    ? 'border-[#FBBF24] bg-[rgba(251,191,36,0.15)] text-[#FBBF24]'
                    : 'border-border bg-bg-card text-text-muted hover:text-[#FBBF24]',
                  favoriteBusy ? 'opacity-50' : '',
                ].join(' ')}
              >
                <AppIcon
                  name={isFavorite ? 'star-filled' : 'star-outline'}
                  size={20}
                  className={isFavorite ? 'text-[#FBBF24]' : undefined}
                  label={isFavorite ? 'Favori' : 'Ajouter aux favoris'}
                />
              </button>
              {trick.siteswap && (
                <span className="text-xs px-2 py-1 rounded-lg bg-bg-card border border-border text-text-muted">
                  {trick.siteswap}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        <OfflineBanner message="Hors connexion — cette fiche peut être incomplète si elle n'a pas été consultée auparavant." />

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-alert-surface border border-alert">
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
            <AnimationPreview trick={trick} variant="detail" />

            {/* Status actuel */}
            {status !== 'NOT_STARTED' && (
              <div className={[
                'flex items-center gap-2 p-3 rounded-xl text-sm font-semibold',
                status === 'MASTERED'    ? 'bg-success/10 border border-success/30 text-success' :
                status === 'IN_PROGRESS' ? 'bg-brand/10 border border-brand/30 text-brand-end' : '',
              ].join(' ')}>
                <ProgressStatusIcon
                  status={status === 'MASTERED' ? 'MASTERED' : 'IN_PROGRESS'}
                  size={16}
                />
                <span>{status === 'MASTERED' ? 'Figure maîtrisée !' : 'Apprentissage en cours'}</span>
              </div>
            )}

            {/* Session button */}
            <button
              onClick={() => navigate(`/student/session/${trick.id}`)}
              disabled={status === 'MASTERED' || savingStatus}
              className="jf-btn-primary w-full min-h-11 rounded-2xl py-3 text-sm disabled:opacity-50"
            >
              <AppIcon name="timer" size={18} label="Session" className="shrink-0" />
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
                  <AppIcon name={RANK_BADGE_ICON.bronze} size={36} label="Rang Bronze" />
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
                  {LIBRARY_OF_JUGGLING_BY_TRICK_NAME[trick.name] && (
                    <p className="text-xs text-text-muted leading-relaxed">
                      Contenu adapté depuis la{' '}
                      <a
                        href={LIBRARY_OF_JUGGLING_BY_TRICK_NAME[trick.name]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-text-secondary hover:text-text-primary"
                      >
                        Library of Juggling
                      </a>
                      .
                    </p>
                  )}
                </div>
              )}

              {tab === 'conseils' && (
                <div className="flex flex-col gap-3">
                  {(trick.learningTips ?? []).length === 0 ? (
                    <p className="text-sm text-text-muted">
                      Aucun conseil détaillé pour cette figure pour le moment.
                    </p>
                  ) : (
                    (trick.learningTips ?? []).map((tip, index) => (
                      <div
                        key={index}
                        className="flex gap-3 p-3 rounded-xl bg-bg-card border border-border"
                      >
                        <AppIcon
                          name={index % 2 === 0 ? 'tip-lightbulb' : 'tip-target'}
                          size={20}
                          className="shrink-0 text-brand-end"
                          label="Conseil"
                        />
                        <p className="text-sm text-text-secondary leading-relaxed">{tip}</p>
                      </div>
                    ))
                  )}
                  {trick.estimatedLearningDuration && (
                    <div className="flex gap-3 p-3 rounded-xl bg-bg-card border border-border">
                      <AppIcon name="timer" size={20} className="shrink-0 text-text-muted" label="Durée" />
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
                        <AppIcon name="status-mastered" size={18} label="prérequis" />
                        <span className="text-sm text-text-primary">{name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>

            {/* Erreur sauvegarde */}
            {statusError && (
              <div className="p-3 rounded-xl text-xs text-alert bg-alert-surface border border-alert">
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
                {savingStatus ? (
                  'Sauvegarde…'
                ) : status === 'MASTERED' ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <AppIcon name="status-mastered" size={18} label="Maîtrisée" />
                    Figure maîtrisée !
                  </span>
                ) : (
                  'Marquer comme maîtrisée'
                )}
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

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  );
}
