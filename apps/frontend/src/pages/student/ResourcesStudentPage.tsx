import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppIcon from '../../components/icons/AppIcon';
import {
  RESOURCE_EXERCISE_ICONS,
  RESOURCE_VIDEO_ICONS,
} from '../../components/icons/iconRegistry';
import BottomNav from '../../components/BottomNav';
import { STUDENT_NAV_ITEMS } from '../../config/studentNav';
import OfflineBanner from '../../components/OfflineBanner';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { resourcesApi, type PedagogicalResource } from '../../api/resourcesApi';
import { studentBrainApi } from '../../api/studentBrainApi';
import {
  getBrainChaptersCompleted,
  setBrainChaptersCompleted,
  setBrainModuleStarted,
} from '../../utils/resourcesLocalState';
import YoutubeVideoCard from '../../components/YoutubeVideoCard';
import { isYoutubeUrl, openExternalResource } from '../../utils/externalResource';

import {
  BRAIN_CHAPTERS,
  BRAIN_MODULE_META,
} from '../../content/brainModuleChapters';

function isBrainChapterSource(resource: PedagogicalResource): boolean {
  return resource.tags.some((t) => t.startsWith('brain-chapter:'));
}

function brainChapterNumber(resource: PedagogicalResource): number | null {
  const tag = resource.tags.find((t) => t.startsWith('brain-chapter:'));
  if (!tag) return null;
  const n = Number.parseInt(tag.split(':')[1] ?? '', 10);
  return Number.isFinite(n) ? n : null;
}

type Tab = 'Vidéos' | 'Exercices' | 'Mon cerveau';

const THUMB_COLORS = ['#8B2BE2', '#4068D8', '#C724B1'];

export default function ResourcesStudentPage() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('Vidéos');
  const [resources, setResources] = useState<PedagogicalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedChapters, setCompletedChapters] = useState<number[]>([]);
  const [brainBusy, setBrainBusy] = useState(false);
  const [brainError, setBrainError] = useState<string | null>(null);
  const [offlineVideoHint, setOfflineVideoHint] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);

  const moduleStarted = completedChapters.length > 0;

  useEffect(() => {
    let cancelled = false;
    resourcesApi
      .list('STUDENT')
      .then((list) => { if (!cancelled) setResources(list); })
      .catch(() => { if (!cancelled) setResources([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadBrain = async () => {
      if (isOnline) {
        try {
          const progress = await studentBrainApi.getProgress();
          if (cancelled) return;
          setCompletedChapters(progress.completedChapters);
          setBrainChaptersCompleted(user.id, progress.completedChapters);
        } catch {
          if (!cancelled) {
            setCompletedChapters(getBrainChaptersCompleted(user.id));
          }
        }
      } else {
        setCompletedChapters(getBrainChaptersCompleted(user.id));
      }
    };

    void loadBrain();
    return () => { cancelled = true; };
  }, [user?.id, isOnline]);

  async function completeBrainChapter(chapterNumber: number) {
    if (!user?.id || brainBusy) return;
    const previousDone =
      chapterNumber === 1 || completedChapters.includes(chapterNumber - 1);
    if (!previousDone) {
      setBrainError(`Termine d'abord le chapitre ${chapterNumber - 1}.`);
      return;
    }
    if (completedChapters.includes(chapterNumber)) return;

    setBrainBusy(true);
    setBrainError(null);
    try {
      if (isOnline) {
        const progress = await studentBrainApi.completeChapter(chapterNumber);
        setCompletedChapters(progress.completedChapters);
        setBrainChaptersCompleted(user.id, progress.completedChapters);
        setBrainModuleStarted(user.id, true);
      } else {
        const next = [...completedChapters, chapterNumber].sort((a, b) => a - b);
        setCompletedChapters(next);
        setBrainChaptersCompleted(user.id, next);
        setBrainModuleStarted(user.id, true);
      }
    } catch {
      setBrainError('Impossible d\'enregistrer ta progression. Réessaie en ligne.');
    } finally {
      setBrainBusy(false);
    }
  }

  const videos = resources.filter((r) => r.resourceType === 'STUDENT_VIDEO');
  const exercises = resources.filter(
    (r) => r.resourceType === 'STUDENT_EXERCISE' && !isBrainChapterSource(r),
  );
  const brainSources = resources.filter(isBrainChapterSource);
  const brainModule = resources.find((r) => r.resourceType === 'BRAIN_MODULE');

  function handlePlayVideo(video: PedagogicalResource) {
    if (!isOnline) {
      setOfflineVideoHint(true);
      return;
    }
    setOfflineVideoHint(false);
    if (!video.resourceUrl) return;
    if (isYoutubeUrl(video.resourceUrl)) {
      setActiveVideoId((current) => (current === video.id ? null : video.id));
      return;
    }
    openExternalResource(video.resourceUrl);
  }

  function handleOpenExercise(ex: PedagogicalResource) {
    if (!isOnline) {
      setOfflineVideoHint(true);
      return;
    }
    openExternalResource(ex.resourceUrl);
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-1">À explorer</h1>
        <p className="text-xs text-text-secondary mb-4">Vidéos, exercices et modules pour progresser</p>

        {/* Tab bar */}
        <div className="flex gap-2">
          {(['Vidéos', 'Exercices', 'Mon cerveau'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                tab === t
                  ? 'bg-linear-to-br from-brand to-brand-end border-brand text-white'
                  : 'bg-bg-card border-border text-text-muted',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <OfflineBanner message="Contenu consultable hors-ligne. Les vidéos nécessitent une connexion pour la lecture." />

        {offlineVideoHint && !isOnline && (
          <p className="text-xs text-brand-end">
            Lecture vidéo indisponible hors-ligne — reconnecte-toi pour regarder le tutoriel.
          </p>
        )}

        {/* ── Vidéos ── */}
        {tab === 'Vidéos' && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Vidéos tutoriels
            </h2>
            {loading && <p className="text-sm text-text-muted">Chargement…</p>}
            <div className="flex flex-col gap-4">
              {videos.map((video, index) => (
                <YoutubeVideoCard
                  key={video.id}
                  title={video.title}
                  subtitle={video.subtitle}
                  metaLabel={video.metaLabel}
                  tags={video.tags}
                  resourceUrl={video.resourceUrl}
                  isActive={activeVideoId === video.id}
                  disabled={!isOnline}
                  onPlay={() => handlePlayVideo(video)}
                  fallbackIcon={RESOURCE_VIDEO_ICONS[index % RESOURCE_VIDEO_ICONS.length]}
                  fallbackAccent={THUMB_COLORS[index % THUMB_COLORS.length]}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Exercices ── */}
        {tab === 'Exercices' && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Exercices guidés
            </h2>
            <div className="flex flex-col gap-3">
              {exercises.map((ex, index) => (
                <div key={ex.id} className="flex items-center gap-3 p-4 rounded-2xl bg-bg-card border border-border">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-brand/10 border border-brand/30 shrink-0">
                    <AppIcon
                      name={RESOURCE_EXERCISE_ICONS[index % RESOURCE_EXERCISE_ICONS.length]}
                      size={22}
                      label={ex.title}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-text-primary text-sm">{ex.title}</p>
                    {ex.subtitle && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{ex.subtitle}</p>
                    )}
                    <p className="text-xs text-text-muted mt-0.5">{ex.metaLabel}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!ex.resourceUrl}
                    aria-label={`Commencer ${ex.title}`}
                    onClick={() => handleOpenExercise(ex)}
                    className="jf-btn-primary jf-btn-primary-sm disabled:opacity-50"
                  >
                    Lancer
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Mon cerveau ── */}
        {tab === 'Mon cerveau' && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Module neurosciences
            </h2>

            {/* Module card */}
            <div className="rounded-2xl overflow-hidden bg-bg-card border border-border">
              {/* Illustration */}
              <div className="h-32 flex items-center justify-center bg-linear-to-br from-[#1A0A2E] to-bg-primary border-b border-border">
                <AppIcon name="brain" size={56} className="text-brand-end" label="Module cerveau" />
              </div>
              <div className="p-4">
                <p className="font-bold text-text-primary text-sm mb-1">
                  {brainModule?.title ?? BRAIN_MODULE_META.title}
                </p>
                <p className="text-xs text-text-secondary mb-3">
                  {brainModule?.subtitle ?? BRAIN_MODULE_META.subtitle}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-3 text-xs text-text-muted">
                    <span>{brainModule?.metaLabel ?? BRAIN_MODULE_META.metaLabel}</span>
                  </div>
                  {!moduleStarted && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-border text-text-muted">
                      Non commencé
                    </span>
                  )}
                </div>

                {brainError && (
                  <p className="text-xs text-alert mb-2">{brainError}</p>
                )}

                <button
                  type="button"
                  disabled={brainBusy}
                  onClick={() => void completeBrainChapter(1)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-linear-to-br from-brand to-brand-end min-h-11 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {moduleStarted && <AppIcon name="play" size={16} label="Continuer" />}
                    {moduleStarted ? 'Continuer le module' : 'Commencer le module'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {BRAIN_CHAPTERS.map((ch) => {
                const done = completedChapters.includes(ch.n);
                const unlocked =
                  ch.n === 1 || completedChapters.includes(ch.n - 1);
                const sources = brainSources.filter(
                  (s) => brainChapterNumber(s) === ch.n,
                );
                return (
                  <div
                    key={ch.n}
                    className={[
                      'rounded-xl bg-bg-card border border-border overflow-hidden',
                      !unlocked && !done ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      disabled={brainBusy || done || !unlocked}
                      onClick={() => void completeBrainChapter(ch.n)}
                      className="flex items-center gap-3 p-3 text-left w-full hover:opacity-90 disabled:cursor-default"
                    >
                      <div
                        className={[
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                          done ? 'bg-success text-white' : 'bg-border text-text-muted',
                        ].join(' ')}
                      >
                        {done ? '✓' : ch.n}
                      </div>
                      <p className={`text-sm flex-1 font-semibold ${done ? 'text-text-primary' : 'text-text-muted'}`}>
                        {ch.title}
                      </p>
                      {done ? (
                        <span className="text-xs text-success">Terminé</span>
                      ) : unlocked ? (
                        <span className="text-xs text-brand-end">Marquer fait</span>
                      ) : null}
                    </button>
                    {unlocked && (
                      <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border/60 pt-2">
                        <p className="text-xs text-text-secondary leading-relaxed">{ch.summary}</p>
                        <p className="text-[0.65rem] text-text-muted">
                          ~{ch.durationMinutes} min de lecture
                        </p>
                        <ul className="flex flex-col gap-1.5 list-disc list-inside text-xs text-text-secondary">
                          {ch.keyPoints.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                        {sources.map((src) => (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => openExternalResource(src.resourceUrl)}
                            disabled={!src.resourceUrl}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-primary/50 px-3 py-2 text-left hover:opacity-90 disabled:opacity-50"
                          >
                            <div>
                              <p className="text-xs font-semibold text-text-primary">{src.title}</p>
                              {src.subtitle && (
                                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{src.subtitle}</p>
                              )}
                            </div>
                            <span className="text-xs text-brand-end shrink-0">En savoir plus →</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  );
}
