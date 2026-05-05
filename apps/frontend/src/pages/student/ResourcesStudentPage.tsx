import { useState } from 'react';
import BottomNav from '../../components/BottomNav';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

type Tab = 'Vidéos' | 'Exercices' | 'Mon cerveau';

const VIDEO_TUTORIALS = [
  {
    id: 1,
    title: 'Cascade 3 balles — Tutoriel complet',
    duration: '3 min 20 s',
    level: 'Débutant',
    tags: ['Ralenti x0.5', 'Face + profil'],
    thumbColor: '#8B2BE2',
    trickEmoji: '🎪',
  },
  {
    id: 2,
    title: 'La Douche — Étape par étape',
    duration: '2 min 45 s',
    level: 'Débutant',
    tags: ['Ralenti x0.25'],
    thumbColor: '#4068D8',
    trickEmoji: '🤹',
  },
];

const EXERCISES = [
  { id: 1, title: 'Échauffement poignets',        duration: '5 min', icon: '🖐️' },
  { id: 2, title: 'Lancer d\'une balle — Précision', duration: '10 min', icon: '🎯' },
  { id: 3, title: 'Échange 2 balles',              duration: '8 min',  icon: '🔄' },
];

export default function ResourcesStudentPage() {
  const [tab, setTab]         = useState<Tab>('Vidéos');
  const [moduleStarted, setModuleStarted] = useState(false);

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

        {/* ── Vidéos ── */}
        {tab === 'Vidéos' && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Vidéos tutoriels
            </h2>
            <div className="flex flex-col gap-4">
              {VIDEO_TUTORIALS.map((video) => (
                <div key={video.id} className="rounded-2xl overflow-hidden bg-bg-card border border-border">
                  {/* Thumbnail */}
                  <div
                    className="relative h-40 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${video.thumbColor}40, #111638)` }}
                  >
                    <span role="img" aria-label={video.title} className="text-6xl">{video.trickEmoji}</span>
                    <button
                      aria-label={`Lire ${video.title}`}
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
                      <span className="text-xs text-text-muted">{video.duration}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full text-success bg-success/10 border border-success/30">
                        {video.level}
                      </span>
                      {video.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-border text-text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
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
              {EXERCISES.map((ex) => (
                <div key={ex.id} className="flex items-center gap-3 p-4 rounded-2xl bg-bg-card border border-border">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-brand/10 border border-brand/30 shrink-0">
                    <span role="img" aria-label={ex.title} className="text-xl">{ex.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-text-primary text-sm">{ex.title}</p>
                    <p className="text-xs text-text-muted">{ex.duration}</p>
                  </div>
                  <button
                    aria-label={`Commencer ${ex.title}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand min-h-8"
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
              <div className="h-32 flex items-center justify-center bg-linear-to-br from-[#1A0A2E] to-[#0A0E2A] border-b border-border">
                <span role="img" aria-label="cerveau" className="text-5xl">🧠</span>
              </div>
              <div className="p-4">
                <p className="font-bold text-text-primary text-sm mb-1">
                  Comment ton cerveau apprend à jongler ?
                </p>
                <p className="text-xs text-text-secondary mb-3">
                  Découvre ce qui se passe dans ta tête quand tu t'entraînes.
                </p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-3 text-xs text-text-muted">
                    <span>3 chapitres</span>
                    <span>·</span>
                    <span>8 min</span>
                  </div>
                  {!moduleStarted && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-border text-text-muted">
                      Non commencé
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setModuleStarted(true)}
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