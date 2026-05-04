import { useState, useEffect, useRef, useCallback } from 'react';
import BottomNav from '../../components/BottomNav';
import {
  catalogueApi,
  LEVEL_LABELS,
  scoreToStars,
  type TrickResponse,
} from '../../api/catalogueApi';

// ── Config ────────────────────────────────────────────────────

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

type FilterLevel = 'Tous' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

const FILTERS: { value: FilterLevel; label: string }[] = [
  { value: 'Tous',         label: 'Tous' },
  { value: 'Beginner',     label: 'Débutant' },
  { value: 'Intermediate', label: 'Intermédiaire' },
  { value: 'Advanced',     label: 'Avancé' },
  { value: 'Expert',       label: 'Expert' },
];

const PAGE_SIZE = 10;

// ── Classes Tailwind statiques par état — aucun style dynamique ──

const LEVEL_CHIP_CLASS: Record<string, string> = {
  Beginner:     'text-[#22C55E] bg-[rgba(34,197,94,0.12)]',
  Intermediate: 'text-[#FF7A00] bg-[rgba(255,122,0,0.12)]',
  Advanced:     'text-[#8B2BE2] bg-[rgba(139,43,226,0.12)]',
  Expert:       'text-[#FF4D4D] bg-[rgba(255,77,77,0.12)]',
};

const FILTER_ACTIVE_CLASS: Record<FilterLevel, string> = {
  Tous:         'bg-gradient-to-br from-[#8B2BE2] to-[#C724B1] text-white border-[#8B2BE2]',
  Beginner:     'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[#22C55E]',
  Intermediate: 'bg-[rgba(255,122,0,0.12)] text-[#FF7A00] border-[#FF7A00]',
  Advanced:     'bg-[rgba(139,43,226,0.12)] text-[#8B2BE2] border-[#8B2BE2]',
  Expert:       'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border-[#FF4D4D]',
};

// ── Sous-composants ───────────────────────────────────────────

function StarRating({ score }: { score: number }) {
  const stars = scoreToStars(score);
  return (
    <span className="flex gap-0.5" aria-label={`Difficulté : ${score} sur 10`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < stars ? 'text-[#FF7A00] text-[0.6rem]' : 'text-border text-[0.6rem]'}>
          ★
        </span>
      ))}
    </span>
  );
}

function DifficultyChip({ level }: { level: string | null }) {
  if (!level) return null;
  const cls = LEVEL_CHIP_CLASS[level] ?? 'text-text-secondary bg-border';
  return (
    <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {LEVEL_LABELS[level] ?? level}
    </span>
  );
}

function AnimationPreview({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="flex items-center justify-center rounded-xl w-20 h-20 bg-bg-input shrink-0 text-3xl" aria-hidden="true">
        🤹
      </div>
    );
  }
  return (
    <iframe
      src={url}
      title={`Animation de la figure ${name}`}
      className="rounded-xl shrink-0 w-20 h-20 bg-bg-input border-0"
      loading="lazy"
      scrolling="no"
    />
  );
}

function TrickCard({ trick, onOpen }: { trick: TrickResponse; onOpen: (t: TrickResponse) => void }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-border">
      <AnimationPreview url={trick.jugglingLabAnimationUrl} name={trick.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-bold text-white text-sm leading-tight truncate">{trick.name}</p>
          {trick.popular && (
            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-[#1A1208] text-[#FF7A00] border border-[#FF7A0033]">
              <span role="img" aria-label="Populaire">🔥</span>{' '}Populaire
            </span>
          )}
        </div>
        <DifficultyChip level={trick.levelName} />
        <div className="mt-1.5 mb-2">
          <StarRating score={trick.difficultyScore} />
        </div>
        {trick.siteswap && (
          <p className="text-[0.6rem] mb-2 text-text-muted">
            Siteswap : <code className="text-text-secondary">{trick.siteswap}</code>
          </p>
        )}
        <p className="text-xs leading-relaxed line-clamp-2 text-text-secondary">{trick.description}</p>
        {trick.prerequisiteNames.length > 0 && (
          <p className="text-[0.6rem] mt-1.5 text-text-muted">
            Prérequis : {trick.prerequisiteNames.join(', ')}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(trick)}
        aria-label={`Voir la figure ${trick.name}`}
        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-br from-[#8B2BE2] to-[#C724B1] transition-opacity hover:opacity-80"
      >
        →
      </button>
    </div>
  );
}

function TrickCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-border animate-pulse">
      <div className="rounded-xl shrink-0 w-20 h-20 bg-border" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 rounded bg-border w-3/5" />
        <div className="h-3 rounded bg-border w-[35%]" />
        <div className="h-3 rounded bg-border w-[90%]" />
        <div className="h-3 rounded bg-border w-3/4" />
      </div>
    </div>
  );
}

function TrickDetailDrawer({ trick, onClose }: { trick: TrickResponse | null; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = trick ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [trick]);

  if (!trick) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/70" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Détail de la figure : ${trick.name}`}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-y-auto bg-[#0D1235] border border-border max-w-[430px] mx-auto max-h-[85vh]"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-5 pb-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-white leading-tight mb-1">{trick.name}</h2>
              <div className="flex items-center gap-2">
                <DifficultyChip level={trick.levelName} />
                {trick.categoryName && (
                  <span className="text-[0.6rem] text-text-muted">{trick.categoryName}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le détail"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-border text-text-secondary text-sm"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-center rounded-2xl mb-5 bg-bg-input h-[180px]">
            {trick.jugglingLabAnimationUrl ? (
              <iframe
                src={trick.jugglingLabAnimationUrl}
                title={`Animation ${trick.name}`}
                className="w-full h-[180px] border-0 rounded-2xl bg-bg-input"
                scrolling="no"
              />
            ) : (
              <span className="text-5xl" aria-hidden="true">🤹</span>
            )}
          </div>

          <div className="flex gap-3 mb-5">
            <div className="flex-1 p-3 rounded-xl text-center bg-bg-card border border-border">
              <div className="font-display text-xl font-bold text-white mb-0.5">{trick.difficultyScore}/10</div>
              <div className="text-[0.65rem] text-text-muted">Difficulté</div>
            </div>
            {trick.estimatedLearningDuration && (
              <div className="flex-1 p-3 rounded-xl text-center bg-bg-card border border-border">
                <div className="font-display text-xl font-bold text-white mb-0.5">{trick.estimatedLearningDuration}min</div>
                <div className="text-[0.65rem] text-text-muted">Apprentissage</div>
              </div>
            )}
            {trick.siteswap && (
              <div className="flex-1 p-3 rounded-xl text-center bg-bg-card border border-border">
                <div className="font-display text-base font-bold text-white mb-0.5"><code>{trick.siteswap}</code></div>
                <div className="text-[0.65rem] text-text-muted">Siteswap</div>
              </div>
            )}
          </div>

          <section className="mb-5">
            <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm leading-relaxed text-text-secondary">{trick.description}</p>
          </section>

          {trick.prerequisiteNames.length > 0 && (
            <section className="mb-6">
              <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-2">Prérequis</h3>
              <div className="flex flex-wrap gap-2">
                {trick.prerequisiteNames.map((name) => (
                  <span key={name} className="px-3 py-1 rounded-lg text-xs font-semibold bg-border text-text-secondary">{name}</span>
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            className="w-full py-3 min-h-12 rounded-xl font-bold text-white text-sm bg-gradient-to-br from-[#8B2BE2] to-[#C724B1]"
          >
            Commencer cette figure →
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page principale ────────────────────────────────────────────

export default function CataloguePage() {
  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter]       = useState<FilterLevel>('Tous');
  const [tricks, setTricks]                   = useState<TrickResponse[]>([]);
  const [popular, setPopular]                 = useState<TrickResponse[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [page, setPage]                       = useState(0);
  const [hasMore, setHasMore]                 = useState(true);
  const [selectedTrick, setSelectedTrick]     = useState<TrickResponse | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    catalogueApi.getPopular().then(setPopular).catch(() => { /* empty */ });
  }, []);

  const fetchTricks = useCallback(async (pageNum: number, reset: boolean) => {
    reset ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const data = await catalogueApi.getTricks({
        level: activeFilter === 'Tous' ? undefined : activeFilter,
        search: debouncedSearch || undefined,
        page: pageNum,
        size: PAGE_SIZE,
      });
      setTricks((prev) => reset ? data.content : [...prev, ...data.content]);
      setHasMore(data.number < data.totalPages - 1);
      setPage(data.number);
    } catch {
      setError('Impossible de charger le catalogue. Vérifie ta connexion.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeFilter, debouncedSearch]);

  useEffect(() => { fetchTricks(0, true); }, [fetchTricks]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-[430px] mx-auto pb-20">

      <header className="px-5 pt-12 pb-4 sticky top-0 z-30 bg-[#0D1235] border-b border-border">
        <h1 className="font-display text-xl font-bold text-white mb-4">Catalogue</h1>

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 bg-bg-input border border-border">
          <span role="img" aria-label="Recherche" className="text-text-muted text-base">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une figure…"
            aria-label="Rechercher une figure de jonglage"
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-text-muted"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Effacer la recherche" className="text-xs text-text-muted">
              ✕
            </button>
          )}
        </div>

        <div role="group" aria-label="Filtrer par niveau" className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.value;
            return (
              <button
                type="button"
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={[
                  'shrink-0 px-4 h-8 rounded-full text-xs font-semibold border transition-all',
                  isActive ? FILTER_ACTIVE_CLASS[f.value] : 'bg-bg-card text-text-muted border-border',
                ].join(' ')}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {error && !loading && (
          <div className="p-4 rounded-2xl text-sm text-center bg-[#2A1020] border border-alert text-alert">
            {error}
          </div>
        )}

        {!loading && !error && activeFilter === 'Tous' && !debouncedSearch && popular.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
              <span role="img" aria-label="Populaire">🔥</span>{' '}Figures populaires
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {popular.map((trick) => (
                <button
                  type="button"
                  key={trick.id}
                  onClick={() => setSelectedTrick(trick)}
                  className="shrink-0 p-3 rounded-2xl text-left transition-opacity hover:opacity-80 w-[140px] bg-bg-card border border-border"
                  aria-label={`Voir la figure populaire : ${trick.name}`}
                >
                  <div className="flex items-center justify-center rounded-xl mb-2 w-full h-20 bg-bg-input" aria-hidden="true">
                    {trick.jugglingLabAnimationUrl ? (
                      <iframe
                        src={trick.jugglingLabAnimationUrl}
                        title={trick.name}
                        className="w-full h-20 border-0 rounded-xl bg-bg-input pointer-events-none"
                        scrolling="no"
                      />
                    ) : (
                      <span className="text-3xl" aria-hidden="true">🤹</span>
                    )}
                  </div>
                  <p className="font-bold text-white text-xs mb-1 truncate" title={trick.name}>{trick.name}</p>
                  <DifficultyChip level={trick.levelName} />
                </button>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && (
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider">
              {debouncedSearch
                ? `Résultats pour "${debouncedSearch}"`
                : activeFilter === 'Tous'
                ? 'Toutes les figures'
                : `Niveau ${LEVEL_LABELS[activeFilter]}`}
            </h2>
            <span className="text-xs text-text-muted">
              {tricks.length} figure{tricks.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => <TrickCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && !error && (
          <>
            {tricks.length === 0 ? (
              <div className="p-8 rounded-2xl text-center bg-bg-card border border-border">
                <div className="text-3xl mb-3" aria-hidden="true">🤷</div>
                <p className="font-bold text-white text-sm mb-1">Aucune figure trouvée</p>
                <p className="text-xs text-text-muted">Essaie un autre terme ou change de filtre.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tricks.map((trick) => <TrickCard key={trick.id} trick={trick} onOpen={setSelectedTrick} />)}
              </div>
            )}

            {hasMore && tricks.length > 0 && (
              <button
                type="button"
                onClick={() => !loadingMore && hasMore && fetchTricks(page + 1, false)}
                disabled={loadingMore}
                className="w-full py-3 min-h-11 rounded-xl text-sm font-semibold bg-bg-card border border-border text-text-secondary disabled:opacity-50"
              >
                {loadingMore ? 'Chargement…' : 'Voir plus de figures'}
              </button>
            )}

            {loadingMore && (
              <div className="flex flex-col gap-3">
                {[1, 2].map((i) => <TrickCardSkeleton key={i} />)}
              </div>
            )}
          </>
        )}
      </main>

      <TrickDetailDrawer trick={selectedTrick} onClose={() => setSelectedTrick(null)} />
      <BottomNav items={navItems} />
    </div>
  );
}