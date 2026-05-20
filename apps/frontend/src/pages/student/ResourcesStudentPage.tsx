import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
import {
  isYoutubeUrl,
  openExternalResource,
  youtubeEmbedUrl,
} from '../../utils/externalResource';

const BRAIN_CHAPTERS = [
  {
    n: 1,
    title: 'La plasticité cérébrale',
    summary:
      'Ton cerveau peut se modifier quand tu apprends : la pratique du jonglage augmente temporairement la matière grise dans les zones qui traitent le mouvement.',
  },
  {
    n: 2,
    title: 'Mémoire motrice et répétition',
    summary:
      'Chaque séance renforce des circuits moteurs : les progrès viennent de la répétition régulière, pas d’un seul coup de chance.',
  },
  {
    n: 3,
    title: 'Le rôle de la concentration',
    summary:
      'Jongler demande une attention soutenue : les deux hémisphères doivent coordonner le regard, les mains et le rythme en même temps.',
  },
] as const;

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
const VIDEO_EMOJIS = ['🎪', '🤹', '🎯'];
const EXERCISE_ICONS = ['🖐️', '🎯', '🔄'];

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
              {videos.map((video, index) => {
                const level = video.tags[0] ?? 'Débutant';
                const extraTags = video.tags.slice(1);
                const thumbColor = THUMB_COLORS[index % THUMB_COLORS.length];
                const trickEmoji = VIDEO_EMOJIS[index % VIDEO_EMOJIS.length];
                const embedSrc =
                  activeVideoId === video.id && video.resourceUrl
                    ? youtubeEmbedUrl(video.resourceUrl)
                    : null;
                return (
                <div key={video.id} className="rounded-2xl overflow-hidden bg-bg-card border border-border">
                  {embedSrc ? (
                    <div className="relative aspect-video bg-black">
                      <iframe
                        title={video.title}
                        src={embedSrc}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                  <div
                    className="relative h-40 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${thumbColor}40, #111638)` }}
                  >
                    <span role="img" aria-label={video.title} className="text-6xl">{trickEmoji}</span>
                    <button
                      type="button"
                      aria-label={`Lire ${video.title}`}
                      disabled={!video.resourceUrl}
                      onClick={() => handlePlayVideo(video)}
                      className="absolute inset-0 flex items-center justify-center disabled:opacity-50"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                        <span className="text-white text-2xl ml-1">▶</span>
                      </div>
                    </button>
                  </div>
                  )}

                  <div className="p-3">
                    <p className="font-bold text-text-primary text-sm mb-1">{video.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-text-muted">{video.metaLabel}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full text-success bg-success/10 border border-success/30">
                        {level}
                      </span>
                      {extraTags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-border text-text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );})}
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
                    <span role="img" aria-label={ex.title} className="text-xl">
                      {EXERCISE_ICONS[index % EXERCISE_ICONS.length]}
                    </span>
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
                <span role="img" aria-label="cerveau" className="text-5xl">🧠</span>
              </div>
              <div className="p-4">
                <p className="font-bold text-text-primary text-sm mb-1">
                  {brainModule?.title ?? 'Comment ton cerveau apprend à jongler ?'}
                </p>
                <p className="text-xs text-text-secondary mb-3">
                  {brainModule?.subtitle ?? "Découvre ce qui se passe dans ta tête quand tu t'entraînes."}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-3 text-xs text-text-muted">
                    <span>{brainModule?.metaLabel ?? '3 chapitres · 8 min'}</span>
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
                  {moduleStarted ? '▶ Continuer le module' : 'Commencer le module →'}
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
