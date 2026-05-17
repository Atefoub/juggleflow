import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import OfflineBanner from '../../components/OfflineBanner';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { resourcesApi, type PedagogicalResource } from '../../api/resourcesApi';
import { getBrainModuleStarted, setBrainModuleStarted } from '../../utils/resourcesLocalState';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

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
  const [moduleStarted, setModuleStarted] = useState(() =>
    user?.id ? getBrainModuleStarted(user.id) : false,
  );
  const [offlineVideoHint, setOfflineVideoHint] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resourcesApi
      .list('STUDENT')
      .then((list) => { if (!cancelled) setResources(list); })
      .catch(() => { if (!cancelled) setResources([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const videos = resources.filter((r) => r.resourceType === 'STUDENT_VIDEO');
  const exercises = resources.filter((r) => r.resourceType === 'STUDENT_EXERCISE');
  const brainModule = resources.find((r) => r.resourceType === 'BRAIN_MODULE');

  function handlePlayVideo() {
    if (isOnline) return;
    setOfflineVideoHint(true);
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
                return (
                <div key={video.id} className="rounded-2xl overflow-hidden bg-bg-card border border-border">
                  {/* Thumbnail */}
                  {/* style intentional — dynamic gradient from data (no Tailwind equivalent) */}
                  <div
                    className="relative h-40 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${thumbColor}40, #111638)` }}
                  >
                    <span role="img" aria-label={video.title} className="text-6xl">{trickEmoji}</span>
                    <button
                      type="button"
                      aria-label={`Lire ${video.title}`}
                      onClick={handlePlayVideo}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                        <span className="text-white text-2xl ml-1">▶</span>
                      </div>
                    </button>
                  </div>

                  {/* Info */}
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
                    <p className="text-xs text-text-muted">{ex.metaLabel}</p>
                  </div>
                  <button
                    aria-label={`Commencer ${ex.title}`}
                    className="jf-btn-primary jf-btn-primary-sm"
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

                <button
                  type="button"
                  onClick={() => {
                    setModuleStarted(true);
                    if (user?.id) setBrainModuleStarted(user.id, true);
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-linear-to-br from-brand to-brand-end min-h-11 hover:opacity-90 transition-opacity"
                >
                  {moduleStarted ? '▶ Continuer le module' : 'Commencer le module →'}
                </button>
              </div>
            </div>

            {/* Chapter list */}
            <div className="flex flex-col gap-2">
              {[
                { n: 1, title: 'La plasticité cérébrale',     done: moduleStarted },
                { n: 2, title: 'Mémoire motrice et répétition', done: false         },
                { n: 3, title: 'Le rôle de la concentration',  done: false         },
              ].map((ch) => (
                <div key={ch.n} className="flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-border">
                  <div className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    ch.done ? 'bg-success text-white' : 'bg-border text-text-muted',
                  ].join(' ')}>
                    {ch.done ? '✓' : ch.n}
                  </div>
                  <p className={`text-sm flex-1 ${ch.done ? 'text-text-primary' : 'text-text-muted'}`}>
                    {ch.title}
                  </p>
                  {ch.done && <span className="text-xs text-success">Terminé</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}


