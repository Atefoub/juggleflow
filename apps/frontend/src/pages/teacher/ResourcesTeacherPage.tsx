import { useEffect, useMemo, useState } from 'react';
import {
  resourcesApi,
  type PedagogicalResource,
  type ResourceType,
} from '../../api/resourcesApi';
import { isExternalHttpUrl, openExternalResource } from '../../utils/externalResource';

type Tab = 'Études' | 'Vidéos' | 'Fiches' | 'Guides EPS';

const TAB_TO_TYPE: Record<Tab, ResourceType | null> = {
  'Études': 'STUDY_PDF',
  'Vidéos': 'TEACHER_VIDEO',
  'Fiches': 'TEACHER_GUIDE',
  'Guides EPS': 'TEACHER_GUIDE',
};

export default function ResourcesTeacherPage() {
  const [tab, setTab] = useState<Tab>('Études');
  const [search, setSearch] = useState('');
  const [resources, setResources] = useState<PedagogicalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    resourcesApi
      .list('TEACHER')
      .then((list) => {
        if (!cancelled) setResources(list);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger les ressources.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const typeFilter = TAB_TO_TYPE[tab];

  const filtered = useMemo(() => {
    let list = resources;
    if (typeFilter) {
      list = list.filter((r) => r.resourceType === typeFilter);
    }
    if (normalizedSearch === '') return list;
    return list.filter((r) => (
      `${r.title} ${r.subtitle ?? ''} ${r.metaLabel ?? ''} ${r.tags.join(' ')}`
        .toLowerCase()
        .includes(normalizedSearch)
    ));
  }, [resources, typeFilter, normalizedSearch]);

  const pdfs = filtered.filter((r) => r.resourceType === 'STUDY_PDF');
  const videos = filtered.filter((r) => r.resourceType === 'TEACHER_VIDEO');
  const guides = filtered.filter(
    (r) => r.resourceType === 'TEACHER_GUIDE' && !r.tags.some((t) => t.toLowerCase() === 'fiche'),
  );
  const sheets = filtered.filter(
    (r) => r.resourceType === 'TEACHER_GUIDE' && r.tags.some((t) => t.toLowerCase() === 'fiche'),
  );

  return (
    <div className="flex flex-1 flex-col w-full min-h-0">

      <header className="px-5 pt-4 pb-4 lg:pt-6 lg:px-0 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-4">Ressources</h1>
        <p className="text-xs text-text-secondary mb-4">Contenus pédagogiques et scientifiques</p>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['Études', 'Vidéos', 'Fiches', 'Guides EPS'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === t
                  ? 'jf-chip-active border-transparent text-white'
                  : 'border-border bg-bg-card text-text-muted',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 lg:px-0 flex flex-col gap-4">

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

        {loading && (
          <p className="text-sm text-text-muted text-center py-8">Chargement…</p>
        )}
        {error && !loading && (
          <p className="text-sm text-alert text-center py-4">{error}</p>
        )}

        {tab === 'Études' && !loading && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Études scientifiques
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {pdfs.length === 0 ? (
                <EmptySearch />
              ) : pdfs.map((res) => (
                <PdfCard key={res.id} res={res} />
              ))}
            </div>
            <p className="text-xs text-text-muted text-center px-4">
              Les articles s&apos;ouvrent sur les sites des éditeurs (PLOS, PMC, ScienceDirect).
            </p>
          </>
        )}

        {tab === 'Vidéos' && !loading && (
          <div className="grid gap-3 lg:grid-cols-2">
            {videos.length === 0 ? <EmptySearch /> : videos.map((v) => (
              <VideoRow key={v.id} res={v} />
            ))}
          </div>
        )}

        {tab === 'Fiches' && !loading && (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {sheets.length === 0 ? <EmptySearch /> : sheets.map((g) => (
              <GuideRow key={g.id} res={g} />
            ))}
          </div>
        )}

        {tab === 'Guides EPS' && !loading && (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {guides.length === 0 ? <EmptySearch /> : guides.map((g) => (
              <GuideRow key={g.id} res={g} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptySearch() {
  return (
    <div className="p-6 rounded-2xl text-center bg-bg-card border border-border text-sm text-text-muted">
      Aucune ressource ne correspond à cette recherche.
    </div>
  );
}

function PdfCard({ res }: { res: PedagogicalResource }) {
  const external = isExternalHttpUrl(res.resourceUrl);
  const canOpen = Boolean(res.resourceUrl);
  return (
    <div className="p-4 rounded-2xl bg-bg-card border border-border">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2A1020] border border-alert/30 shrink-0">
          <span role="img" aria-label="PDF" className="text-lg">📄</span>
        </div>
        <div className="flex-1">
          <p className="font-bold text-text-primary text-sm leading-tight mb-1">{res.title}</p>
          {res.subtitle && <p className="text-xs text-text-muted">{res.subtitle}</p>}
          {res.metaLabel && <p className="text-xs text-text-muted">{res.metaLabel}</p>}
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
        <button
          type="button"
          disabled={!canOpen}
          aria-label={external ? `Ouvrir ${res.title}` : `Télécharger ${res.title}`}
          onClick={() => {
            if (!canOpen || !res.resourceUrl) return;
            if (external) {
              openExternalResource(res.resourceUrl);
              return;
            }
            void resourcesApi.download(res.id, res.title);
          }}
          className="jf-btn-secondary jf-btn-secondary-sm inline-flex gap-1 disabled:opacity-50"
        >
          <span role="img" aria-label={external ? 'lien' : 'télécharger'}>
            {external ? '↗' : '↓'}
          </span>
          {external ? 'Lire' : 'PDF'}
        </button>
      </div>
    </div>
  );
}

function VideoRow({ res }: { res: PedagogicalResource }) {
  const level = res.tags[0] ?? '';
  return (
    <button
      type="button"
      disabled={!res.resourceUrl}
      onClick={() => openExternalResource(res.resourceUrl)}
      className="p-4 rounded-2xl bg-bg-card border border-border flex items-center gap-3 w-full text-left hover:opacity-90 disabled:opacity-50"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand/20 border border-brand/40 shrink-0">
        <span role="img" aria-label="vidéo" className="text-lg">▶️</span>
      </div>
      <div className="flex-1">
        <p className="font-bold text-text-primary text-sm">{res.title}</p>
        <p className="text-xs text-text-muted">
          {res.metaLabel}{level ? ` · ${level}` : ''}
        </p>
        {res.subtitle && <p className="text-xs text-text-secondary mt-0.5">{res.subtitle}</p>}
      </div>
      {res.resourceUrl && <span className="text-xs text-brand-end shrink-0">Regarder →</span>}
    </button>
  );
}

function GuideRow({ res }: { res: PedagogicalResource }) {
  const external = isExternalHttpUrl(res.resourceUrl);
  const canOpen = Boolean(res.resourceUrl);
  return (
    <div className="p-4 rounded-2xl bg-bg-card border border-border flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success/10 border border-success/30 shrink-0">
        <span role="img" aria-label="guide" className="text-lg">📗</span>
      </div>
      <div className="flex-1">
        <p className="font-bold text-text-primary text-sm">{res.title}</p>
        {res.subtitle && <p className="text-xs text-text-secondary">{res.subtitle}</p>}
        {res.metaLabel && <p className="text-xs text-text-muted">{res.metaLabel}</p>}
      </div>
      <button
        type="button"
        disabled={!canOpen}
        aria-label={external ? `Ouvrir ${res.title}` : `Télécharger ${res.title}`}
        onClick={() => {
          if (!canOpen || !res.resourceUrl) return;
          if (external) {
            openExternalResource(res.resourceUrl);
            return;
          }
          void resourcesApi.download(res.id, res.title);
        }}
        className="text-xs px-2 py-1.5 rounded-lg bg-success/10 border border-success/30 text-success font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {external ? '↗' : '↓'}
      </button>
    </div>
  );
}
