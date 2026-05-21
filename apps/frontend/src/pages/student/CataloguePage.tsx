import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import AppIcon from '../../components/icons/AppIcon';
import AnimationPreview from '../../components/catalogue/AnimationPreview';
import DifficultyChip from '../../components/catalogue/DifficultyChip';
import ProgressChip from '../../components/catalogue/ProgressChip';
import type { TrickProgressStatus } from '../../components/catalogue/progressStatus';
import { TrickCard, TrickCardSkeleton } from '../../components/catalogue/TrickCard';
import { STUDENT_NAV_ITEMS } from '../../config/studentNav';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import OfflineBanner from '../../components/OfflineBanner';
import { getPopularTricks, getTricksPage } from '../../api/catalogueOffline';
import { LEVEL_LABELS, type TrickResponse } from '../../api/catalogueApi';
import { getStudentProgress } from '../../api/studentOffline';
import { useAuth } from '../../context/AuthContext';
import { mergePendingIntoProgress } from '../../utils/offlineQueue';
import type { TrickProgress } from '../../api/studentApi';
import { PROGRESS_UPDATED_EVENT } from '../../lib/progressEvents';
import { favoritesApi } from '../../api/favoritesApi';
import {
  getCachedFavoriteTricks,
  setCachedFavoriteIds,
  setCachedFavoriteTricks,
} from '../../utils/favoritesStore';


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


const FILTER_ACTIVE_CLASS: Record<FilterLevel, string> = {
  Tous:         'bg-linear-to-br from-[#8B2BE2] to-[#C724B1] text-white border-[#8B2BE2]',
  Beginner:     'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[#22C55E]',
  Intermediate: 'bg-[rgba(139,43,226,0.14)] text-[#C724B1] border-[#8B2BE2]',
  Advanced:     'bg-[rgba(139,43,226,0.12)] text-[#8B2BE2] border-[#8B2BE2]',
  Expert:       'bg-[rgba(255,77,77,0.12)] text-[#FF4D4D] border-[#FF4D4D]',
  Favoris:      'bg-[rgba(255,193,7,0.15)] text-[#FBBF24] border-[#FBBF24]',
};


export default function CataloguePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter]       = useState<FilterLevel>('Tous');
  const [tricks, setTricks]                   = useState<TrickResponse[]>([]);
  const [popular, setPopular]                 = useState<TrickResponse[]>([]);
  const [progressById, setProgressById]       = useState<Record<number, TrickProgressStatus>>({});
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
        const next: Record<number, TrickProgressStatus> = {};
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
      const { detail } = evt as CustomEvent<{ trickId: number; status: TrickProgressStatus }>;
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
          <AppIcon name="search" size={18} className="text-text-muted shrink-0" label="Recherche" />
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
              <AppIcon name="tag-popular" size={14} className="inline shrink-0" label="Populaire" />{' '}
              Figures populaires
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
                  <AnimationPreview trick={trick} variant="tile" />
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

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  );
}
