import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import OfflineBanner from '../../components/OfflineBanner';
import { getPopularTricks, getTricksPage } from '../../api/catalogueOffline';
import { LEVEL_LABELS, scoreToStars, type TrickResponse } from '../../api/catalogueApi';
import { getStudentProgress } from '../../api/studentOffline';
import { useAuth } from '../../context/AuthContext';
import { mergePendingIntoProgress } from '../../utils/offlineQueue';
import type { TrickProgress } from '../../api/studentApi';
import { resolveTrickAnimation } from '../../utils/jugglingLab';
import { PROGRESS_UPDATED_EVENT } from '../../lib/progressEvents';
import { favoritesApi } from '../../api/favoritesApi';
import {
  getCachedFavoriteTricks,
  setCachedFavoriteIds,
  setCachedFavoriteTricks,
} from '../../utils/favoritesStore';


const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

type FilterLevel = 'Tous' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Favoris';

const FILTERS: { value: FilterLevel; label: string }[] = [
  { value: 'Tous',         label: 'Tous' },
  { value: 'Beginner',     label: 'Débutant' },
  { value: 'Intermediate', label: 'Intermédiaire' },
  { value: 'Advanced',     label: 'Avancé' },
  { value: 'Expert',       label: 'Expert' },
  { value: 'Favoris',      label: 'Favoris' },
];

const PAGE_SIZE = 10;


const LEVEL_CHIP_CLASS: Record<string, string> = {
  Beginner:     'text-[#22C55E] bg-[rgba(34,197,94,0.12)]',
  Intermediate: 'text-[#C724B1] bg-[rgba(139,43,226,0.14)]',
  Advanced:     'text-[#8B2BE2] bg-[rgba(139,43,226,0.12)]',
  Expert:       'text-[#FF4D4D] bg-[rgba(255,77,77,0.12)]',
};

const FILTER_ACTIVE_CLASS: Record<FilterLevel, string> = {
  Tous:         'bg-linear-to-br from-[#8B2BE2] to-[#C724B1] text-white border-[#8B2BE2]',
  Beginner:     'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[#22C55E]',
  Intermediate: 'bg-[rgba(139,43,226,0.14)] text-[#C724B1] border-[#8B2BE2]',
  Advanced:     'bg-[rgba(139,43,226,0.12)] text-[#8B2BE2] border-[#8B2BE2]',
  Expert:       'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border-[#FF4D4D]',
  Favoris:      'bg-[rgba(255,193,7,0.15)] text-[#FBBF24] border-[#FBBF24]',
};


function StarRating({ score }: { score: number }) {
  const stars = scoreToStars(score);
  return (
    <span className="flex gap-0.5" aria-label={`Difficulté : ${score} sur 10`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < stars ? 'text-brand-end text-[0.6rem]' : 'text-border text-[0.6rem]'}>
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

function AnimationPreview({ trick }: { trick: TrickResponse }) {
  const resolved = resolveTrickAnimation(trick, {
    width: 200,
    height: 225,
    slowdown: 2,
  });
  if (!resolved) {
    return (
      <div className="flex items-center justify-center rounded-xl w-20 h-20 bg-bg-input shrink-0 text-3xl" aria-hidden="true">
        🤹
      </div>
    );
  }
  if (resolved.kind === 'iframe') {
    return (
      <iframe
        src={resolved.src}
        title={`Animation de la figure ${trick.name}`}
        className="rounded-xl shrink-0 w-20 h-20 bg-bg-input border-0"
        loading="lazy"
        scrolling="no"
      />
    );
  }
  return (
    <img
      src={resolved.src}
      alt={resolved.alt}
      className="rounded-xl shrink-0 w-20 h-20 object-cover bg-bg-input"
      loading="lazy"
      decoding="async"
    />
  );
}

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

function ProgressChip({ status }: { status: ProgressStatus }) {
  if (status === 'NOT_STARTED') return null;
  const cfg = status === 'MASTERED'
    ? { icon: '✅', label: 'Maîtrisée', cls: 'bg-success/10 text-success border border-success/30' }
    : { icon: '🔄', label: 'En cours',  cls: 'bg-brand/10 text-brand-end border border-brand/30' };

  return (
    <span className={`text-[0.55rem] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      <span aria-hidden="true">{cfg.icon}</span>{' '}{cfg.label}
    </span>
  );
}

function TrickCard({
  trick,
  status,
  onOpen,
}: {
  trick: TrickResponse;
  status: ProgressStatus;
  onOpen: (t: TrickResponse) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-border">
      <AnimationPreview trick={trick} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-bold text-white text-sm leading-tight truncate">{trick.name}</p>
          <div className="flex items-center gap-2 shrink-0">
            <ProgressChip status={status} />
            {trick.popular && (
              <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full bg-[#1A1028] text-brand-end border border-brand/35">
                <span role="img" aria-label="Populaire">🔥</span>{' '}Populaire
              </span>
            )}
          </div>
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
        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold text-white bg-linear-to-br from-[#8B2BE2] to-[#C724B1] transition-opacity hover:opacity-80"
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


export default function CataloguePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter]       = useState<FilterLevel>('Tous');
  const [tricks, setTricks]                   = useState<TrickResponse[]>([]);
  const [popular, setPopular]                 = useState<TrickResponse[]>([]);
  const [progressById, setProgressById]       = useState<Record<number, ProgressStatus>>({});
  const [loading, setLoading]                 = useState(true);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [page, setPage]                       = useState(0);
  const [hasMore, setHasMore]                 = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    getPopularTricks(isOnline).then(setPopular).catch(() => { /* empty */ });
  }, [isOnline]);

  useEffect(() => {
    if (!user?.id) return;
    getStudentProgress(isOnline, user.id)
      .then((progress) => mergePendingIntoProgress(user.id, progress))
      .then((progress: TrickProgress[]) => {
        const next: Record<number, ProgressStatus> = {};
        for (const p of progress) {
          next[p.trickId] = p.status;
        }
        setProgressById(next);
      })
      .catch(() => {
        // silencieux : le catalogue reste utilisable sans l'info de progression
      });
  }, [user?.id, isOnline]);

  useEffect(() => {
    const handler = (evt: Event) => {
      const { detail } = evt as CustomEvent<{ trickId: number; status: ProgressStatus }>;
      if (!detail?.trickId || !detail.status) return;
      setProgressById((prev) => ({ ...prev, [detail.trickId]: detail.status }));
    };

    window.addEventListener(PROGRESS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PROGRESS_UPDATED_EVENT, handler);
  }, []);

  const fetchTricks = useCallback(async (pageNum: number, reset: boolean) => {
    if (activeFilter === 'Favoris') {
      if (!user?.id) return;
      reset ? setLoading(true) : setLoadingMore(true);
      setError(null);
      try {
        let list: TrickResponse[];
        if (isOnline) {
          list = await favoritesApi.list();
          setCachedFavoriteTricks(user.id, list);
        } else {
          list = getCachedFavoriteTricks(user.id);
          if (list.length === 0) {
            throw new Error('OFFLINE_FAVORITES_EMPTY');
          }
        }
        const q = debouncedSearch.trim().toLowerCase();
        const filtered = q
          ? list.filter((t) => t.name.toLowerCase().includes(q))
          : list;
        setTricks(filtered);
        setHasMore(false);
        setPage(0);
      } catch (err) {
        const code = err instanceof Error ? err.message : '';
        setError(
          code === 'OFFLINE_FAVORITES_EMPTY'
            ? 'Aucun favori en cache. Consulte tes favoris une fois en ligne.'
            : 'Impossible de charger tes favoris.',
        );
        if (reset) setTricks([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
      return;
    }

    reset ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const data = await getTricksPage(isOnline, {
        level: activeFilter === 'Tous' ? undefined : activeFilter,
        search: debouncedSearch || undefined,
        page: pageNum,
        size: PAGE_SIZE,
      });
      setTricks((prev) => reset ? data.content : [...prev, ...data.content]);
      setHasMore(data.number < data.totalPages - 1);
      setPage(data.number);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(
        code === 'OFFLINE_CATALOGUE_EMPTY'
          ? 'Catalogue hors-ligne vide. Active le mode hors-ligne dans Profil (en ligne) pour précharger.'
          : 'Impossible de charger le catalogue. Vérifie ta connexion.',
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeFilter, debouncedSearch, isOnline, user?.id]);

  useEffect(() => { fetchTricks(0, true); }, [fetchTricks]);

  useEffect(() => {
    if (!user?.id || !isOnline) return;
    favoritesApi
      .listIds()
      .then((ids) => setCachedFavoriteIds(user.id, ids))
      .catch(() => { /* silent */ });
  }, [user?.id, isOnline]);

  const activeFiltersCount =
    (activeFilter !== 'Tous' ? 1 : 0) + (debouncedSearch ? 1 : 0);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      <header className="px-5 pt-12 pb-4 sticky top-0 z-30 bg-[#0D1235] border-b border-border">
        <h1 className="font-display text-xl font-bold text-white mb-4">Catalogue</h1>

        <OfflineBanner
          className="mb-3"
          message="Hors connexion — le catalogue peut être partiellement disponible si déjà consulté."
        />

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

        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-text-muted">
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('Tous');
                setSearch('');
              }}
              className="text-xs font-semibold text-text-secondary hover:opacity-80 transition-opacity"
            >
              Réinitialiser
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {error && !loading && (
          <div className="p-4 rounded-2xl text-sm text-center bg-[#2A1020] border border-alert text-alert">
            {!isOnline ? 'Hors connexion. Connecte-toi une première fois pour charger ces données.' : error}
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
                  onClick={() => navigate(`/student/trick/${trick.id}`)}
                  className="shrink-0 p-3 rounded-2xl text-left transition-opacity hover:opacity-80 w-35 bg-bg-card border border-border"
                  aria-label={`Voir la figure populaire : ${trick.name}`}
                >
                  <div className="flex items-center justify-center rounded-xl mb-2 w-full h-20 bg-bg-input overflow-hidden" aria-hidden="true">
                    {(() => {
                      const r = resolveTrickAnimation(trick, {
                        width: 240,
                        height: 270,
                        slowdown: 2,
                      });
                      if (!r) return <span className="text-3xl">🤹</span>;
                      if (r.kind === 'iframe') {
                        return (
                          <iframe
                            src={r.src}
                            title={trick.name}
                            className="w-full h-20 border-0 rounded-xl bg-bg-input pointer-events-none"
                            scrolling="no"
                          />
                        );
                      }
                      return (
                        <img
                          src={r.src}
                          alt=""
                          className="w-full h-20 object-cover rounded-xl bg-bg-input pointer-events-none"
                          loading="lazy"
                          decoding="async"
                        />
                      );
                    })()}
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-bold text-white text-xs truncate" title={trick.name}>{trick.name}</p>
                    <ProgressChip status={progressById[trick.id] ?? 'NOT_STARTED'} />
                  </div>
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
                : activeFilter === 'Favoris'
                ? 'Mes favoris'
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
                <p className="text-xs text-text-muted">
                  {activeFilter === 'Favoris'
                    ? 'Ajoute des figures en favori depuis leur fiche détail (étoile).'
                    : 'Essaie un autre terme ou change de filtre.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tricks.map((trick) => (
                  <TrickCard
                    key={trick.id}
                    trick={trick}
                    status={progressById[trick.id] ?? 'NOT_STARTED'}
                    onOpen={(t) => navigate(`/student/trick/${t.id}`)}
                  />
                ))}
              </div>
            )}

            {hasMore && tricks.length > 0 && activeFilter !== 'Favoris' && (
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

      <BottomNav items={navItems} />
    </div>
  );
}
