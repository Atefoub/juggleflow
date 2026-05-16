import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import PathTrickList from '../../components/student/PathTrickList';
import OfflineBanner from '../../components/OfflineBanner';
import type { LearningPath } from '../../api/studentApi';
import { getStudentLearningPaths, getStudentProgress } from '../../api/studentOffline';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { mergePendingIntoProgress } from '../../utils/offlineQueue';
import { PROGRESS_UPDATED_EVENT } from '../../lib/progressEvents';
import { computePathCompletionPercent } from '../../utils/pathProgress';

const navItems = [
  { label: 'Accueil', icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue', icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil', icon: '👤', path: '/student/profil' },
];

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

export default function StudentLearningPathPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  const [allPaths, setAllPaths] = useState<LearningPath[]>([]);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [pathProgressPercent, setPathProgressPercent] = useState(0);
  const [progressByTrickId, setProgressByTrickId] = useState<Record<number, ProgressStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!user?.id) return;
    const wantedId = pathId ? Number(pathId) : null;

    Promise.all([
      getStudentLearningPaths(isOnline, user.id),
      getStudentProgress(isOnline, user.id).then((p) => mergePendingIntoProgress(user.id, p)),
    ])
      .then(async ([paths, mergedProgress]) => {
        setAllPaths(paths);
        const selected =
          wantedId != null && !Number.isNaN(wantedId)
            ? paths.find((p) => p.id === wantedId) ?? paths[0] ?? null
            : paths[0] ?? null;
        setPath(selected);
        if (!selected) {
          setError('Aucun parcours assigné.');
          setPathProgressPercent(0);
          return;
        }
        setError(null);
        const byId: Record<number, ProgressStatus> = {};
        for (const row of mergedProgress) {
          byId[row.trickId] = row.status;
        }
        setProgressByTrickId(byId);
        setPathProgressPercent(await computePathCompletionPercent(selected, byId));
      })
      .catch(() =>
        setError(
          isOnline
            ? 'Impossible de charger le parcours.'
            : 'Parcours non disponible hors-ligne. Active le préchargement depuis Profil.',
        ),
      )
      .finally(() => setLoading(false));
  }, [user?.id, isOnline, pathId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    reload();
  }, [reload]);

  useEffect(() => {
    window.addEventListener(PROGRESS_UPDATED_EVENT, reload);
    return () => window.removeEventListener(PROGRESS_UPDATED_EVENT, reload);
  }, [reload]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs text-brand-end mb-3 hover:opacity-80"
        >
          ← Retour
        </button>
        <h1 className="font-display font-bold text-text-primary text-xl">
          {path?.pathName ?? 'Mes parcours'}
        </h1>
        {path?.targetLevel && (
          <p className="text-xs text-text-secondary mt-1">Niveau : {path.targetLevel}</p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <OfflineBanner />

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {loading && <div className="h-24 rounded-2xl animate-pulse bg-bg-card" />}

        {!loading && allPaths.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allPaths.map((p) => {
              const active = path?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/student/parcours/${p.id}`)}
                  className={[
                    'shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border min-h-10',
                    active
                      ? 'bg-linear-to-br from-brand to-brand-end border-brand text-white'
                      : 'bg-bg-card border-border text-text-muted',
                  ].join(' ')}
                >
                  {p.pathName}
                </button>
              );
            })}
          </div>
        )}

        {!loading && path && (
          <section className="p-4 rounded-2xl bg-bg-card border border-border">
            {path.description && (
              <p className="text-xs text-text-secondary mb-3">{path.description}</p>
            )}
            <p className="text-xs text-text-muted mb-2">
              {path.stepCount} figure{path.stepCount > 1 ? 's' : ''}
              {path.estimatedDurationDays != null ? ` · ~${path.estimatedDurationDays} jours` : ''}
            </p>
            <div className="flex justify-between mb-2">
              <span className="text-xs text-text-muted">Figures maîtrisées dans ce parcours</span>
              <span className="text-xs text-text-secondary font-bold">{pathProgressPercent}%</span>
            </div>
            <ProgressBar
              value={pathProgressPercent}
              color="linear-gradient(90deg, #8B2BE2, #C724B1)"
              height="8px"
            />
            <h2 className="font-display font-bold text-text-primary text-xs uppercase tracking-wider mt-4 mb-0">
              Étapes
            </h2>
            <PathTrickList path={path} progressByTrickId={progressByTrickId} />
          </section>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
