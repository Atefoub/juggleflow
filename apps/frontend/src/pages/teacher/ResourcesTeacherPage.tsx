import { useMemo, useState } from 'react';
import BottomNav from '../../components/BottomNav';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours/assigner' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

type Tab = 'Études' | 'Vidéos' | 'Fiches' | 'Guides EPS';

const PDF_RESOURCES = [
  {
    id: 1,
    title: 'Impact du jonglage sur la plasticité cérébrale',
    authors: 'Draganski et al., 2004 · Nature',
    pages: '4 pages',
    tags: ['Neurosciences', 'Cycle 2-3'],
    url: '#',
  },
  {
    id: 2,
    title: 'Jonglage et développement de la coordination bilatérale',
    authors: 'INSERM, 2019 · Rapport de recherche',
    pages: '12 pages',
    tags: ['Motricité', 'Cycle 1-2'],
    url: '#',
  },
  {
    id: 3,
    title: "Concentration et activités d'adresse en école primaire",
    authors: 'MEN DGESCO, 2021 · Guide officiel',
    pages: '8 pages',
    tags: ['Concentration', 'EPS'],
    url: '#',
  },
];

const VIDEO_RESOURCES = [
  { id: 1, title: 'Formation enseignant — Enseigner la cascade', duration: '12 min', level: 'Débutant' },
  { id: 2, title: 'Gestion de classe en EPS jonglage', duration: '8 min',  level: 'Tous niveaux' },
];

const GUIDE_RESOURCES = [
  { id: 1, title: 'Guide pédagogique cycle 2 — Jonglage',     pages: '20 pages' },
  { id: 2, title: 'Progressions EPS — Manipulation d\'objets', pages: '15 pages' },
];

export default function ResourcesTeacherPage() {
  const [tab, setTab] = useState<Tab>('Études');
  const [search, setSearch] = useState('');

  const normalizedSearch = search.trim().toLowerCase();

  const filteredPdfs = useMemo(() => {
    if (normalizedSearch === '') return PDF_RESOURCES;
    return PDF_RESOURCES.filter((r) => (
      `${r.title} ${r.authors} ${r.pages} ${r.tags.join(' ')}`.toLowerCase().includes(normalizedSearch)
    ));
  }, [normalizedSearch]);

  const filteredVideos = useMemo(() => {
    if (normalizedSearch === '') return VIDEO_RESOURCES;
    return VIDEO_RESOURCES.filter((v) => (
      `${v.title} ${v.duration} ${v.level}`.toLowerCase().includes(normalizedSearch)
    ));
  }, [normalizedSearch]);

  const filteredGuides = useMemo(() => {
    if (normalizedSearch === '') return GUIDE_RESOURCES;
    return GUIDE_RESOURCES.filter((g) => (
      `${g.title} ${g.pages}`.toLowerCase().includes(normalizedSearch)
    ));
  }, [normalizedSearch]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-4">Ressources</h1>
        <p className="text-xs text-text-secondary mb-4">Contenus pédagogiques et scientifiques</p>

        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['Études', 'Vidéos', 'Fiches', 'Guides EPS'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                tab === t
                  ? 'bg-teacher border-teacher text-white'
                  : 'bg-bg-card border-border text-text-muted',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-card border border-border">
          <span role="img" aria-label="recherche" className="text-sm">🔍</span>
          <input
            type="search"
            placeholder="Rechercher une ressource…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="text-text-muted hover:text-text-secondary transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Études ── */}
        {tab === 'Études' && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Études scientifiques — PDF téléchargeables
            </h2>
            <div className="flex flex-col gap-3">
              {filteredPdfs.length === 0 ? (
                <div className="p-6 rounded-2xl text-center bg-bg-card border border-border text-sm text-text-muted">
                  Aucune ressource ne correspond à cette recherche.
                </div>
              ) : filteredPdfs.map((res) => (
                <div key={res.id} className="p-4 rounded-2xl bg-bg-card border border-border">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2A1020] border border-alert/30 shrink-0">
                      <span role="img" aria-label="PDF" className="text-lg">📄</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-text-primary text-sm leading-tight mb-1">{res.title}</p>
                      <p className="text-xs text-text-muted">{res.authors}</p>
                      <p className="text-xs text-text-muted">{res.pages}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {res.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-border text-text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <a
                      href={res.url}
                      aria-label={`Télécharger ${res.title}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teacher/20 border border-teacher/40 text-xs font-semibold text-teacher"
                    >
                      <span role="img" aria-label="télécharger">↓</span>
                      PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-text-muted text-center px-4">
              Les ressources sont hébergées sur les serveurs JuggleFlow. Aucune donnée élève n'est transmise lors du téléchargement.
            </p>
          </>
        )}

        {/* ── Vidéos ── */}
        {tab === 'Vidéos' && (
          <div className="flex flex-col gap-3">
            {filteredVideos.length === 0 ? (
              <div className="p-6 rounded-2xl text-center bg-bg-card border border-border text-sm text-text-muted">
                Aucune ressource ne correspond à cette recherche.
              </div>
            ) : filteredVideos.map((v) => (
              <div key={v.id} className="p-4 rounded-2xl bg-bg-card border border-border flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand/20 border border-brand/40 shrink-0">
                  <span role="img" aria-label="vidéo" className="text-lg">▶️</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-text-primary text-sm">{v.title}</p>
                  <p className="text-xs text-text-muted">{v.duration} · {v.level}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Fiches ── */}
        {tab === 'Fiches' && (
          <div className="p-4 rounded-2xl bg-bg-card border border-border text-sm text-text-muted text-center">
            Bientôt disponible — fiches pédagogiques par figure.
          </div>
        )}

        {/* ── Guides EPS ── */}
        {tab === 'Guides EPS' && (
          <div className="flex flex-col gap-3">
            {filteredGuides.length === 0 ? (
              <div className="p-6 rounded-2xl text-center bg-bg-card border border-border text-sm text-text-muted">
                Aucune ressource ne correspond à cette recherche.
              </div>
            ) : filteredGuides.map((g) => (
              <div key={g.id} className="p-4 rounded-2xl bg-bg-card border border-border flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success/10 border border-success/30 shrink-0">
                  <span role="img" aria-label="guide" className="text-lg">📗</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-text-primary text-sm">{g.title}</p>
                  <p className="text-xs text-text-muted">{g.pages}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Télécharger ${g.title}`}
                  className="text-xs px-2 py-1.5 rounded-lg bg-success/10 border border-success/30 text-success font-semibold hover:opacity-80 transition-opacity"
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}