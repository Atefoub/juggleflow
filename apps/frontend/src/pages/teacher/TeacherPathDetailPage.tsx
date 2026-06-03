import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProgressBar from '../../components/ProgressBar';
import { pathsApi } from '../../api/teacher/pathsApi';
import { teacherQueryKeys } from '../../api/teacher/queryKeys';
import { useInvalidateTeacherClass } from '../../hooks/teacher/useTeacherClassDataQuery';
import { useTeacherPathDetailQuery } from '../../hooks/teacher/useTeacherPathDetailQuery';

function pct(done: number, total: number): number {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export default function TeacherPathDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const invalidateClass = useInvalidateTeacherClass();

  const classId = useMemo(() => Number(params.classId), [params.classId]);
  const pathId  = useMemo(() => Number(params.pathId),  [params.pathId]);
  const shouldAutoDownload = useMemo(() => {
    const q = new URLSearchParams(location.search);
    return q.get('download') === 'csv';
  }, [location.search]);

  const validParams = Number.isFinite(classId) && Number.isFinite(pathId);
  const paramError = validParams ? null : 'Paramètres invalides.';

  const { path, progress, loading, error: loadError } = useTeacherPathDetailQuery(
    validParams ? classId : null,
    validParams ? pathId : null,
  );

  const [actionError, setActionError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const autoDownloadedRef = useRef(false);

  const error = paramError ?? actionError ?? loadError;

  const unassignMutation = useMutation({
    mutationFn: () => pathsApi.unassignPathFromClass(classId, pathId),
    onSuccess: () => {
      invalidateClass(classId);
      void queryClient.invalidateQueries({
        queryKey: teacherQueryKeys.teacherPathDetail(classId, pathId),
      });
      void queryClient.invalidateQueries({
        queryKey: teacherQueryKeys.classProgress(classId, pathId),
      });
      navigate('/teacher/dashboard');
    },
    onError: () => {
      setActionError('Erreur lors de la désassignation. Veuillez réessayer.');
    },
  });

  async function handleDownloadCsv() {
    if (!validParams || isDownloading) return;
    setIsDownloading(true);
    setActionError(null);
    try {
      const blob = await pathsApi.downloadPathProgressCsv(classId, pathId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress_class_${classId}_path_${pathId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Impossible de télécharger le CSV.');
    } finally {
      setIsDownloading(false);
    }
  }

  useEffect(() => {
    if (!shouldAutoDownload) return;
    if (autoDownloadedRef.current) return;
    if (loading) return;
    if (error) return;
    if (!validParams) return;
    autoDownloadedRef.current = true;
    void handleDownloadCsv();
  }, [shouldAutoDownload, loading, error, classId, pathId, validParams]);

  const classAvg = useMemo(() => {
    if (progress.length === 0) return 0;
    return Math.round(
      progress.reduce((sum, s) => sum + (s.completionPercent ?? 0), 0) / progress.length
    );
  }, [progress]);

  return (
    <div className="flex flex-1 flex-col w-full min-h-0">
      <header className="px-5 pt-4 pb-4 lg:pt-6 lg:px-0 bg-bg-header border-b border-border">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            ← Retour
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDownloadCsv()}
              disabled={isDownloading}
              className="jf-btn-secondary jf-btn-secondary-sm rounded-xl disabled:opacity-60"
            >
              {isDownloading ? '…' : 'CSV'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/teacher/parcours/assigner?classId=${classId}&pathId=${pathId}`)}
              className="jf-btn-secondary jf-btn-secondary-sm rounded-xl"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Désassigner ce parcours de la classe ?')) return;
                setActionError(null);
                unassignMutation.mutate();
              }}
              disabled={unassignMutation.isPending}
              className="text-xs px-3 py-1.5 rounded-xl text-alert border border-alert/40 bg-alert/10 font-semibold disabled:opacity-60"
            >
              {unassignMutation.isPending ? '…' : 'Désassigner'}
            </button>
          </div>
        </div>

        <h1 className="font-display font-bold text-text-primary text-xl">
          {path ? path.pathName : 'Parcours'}
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Classe #{validParams ? classId : '—'} · {progress.length} élève{progress.length > 1 ? 's' : ''}
        </p>

        <div className="mt-4 p-4 rounded-2xl bg-bg-card border border-border">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest mb-1 text-text-muted">Progression moyenne</p>
              <p className="font-display text-4xl font-bold text-text-primary">{classAvg}%</p>
            </div>
            <div className="text-xs text-text-muted text-right">
              {path?.stepCount ? `${path.stepCount} figure${path.stepCount > 1 ? 's' : ''}` : '—'}
              {path?.targetLevel ? ` · ${path.targetLevel}` : ''}
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={classAvg} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="8px" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 lg:px-0 flex flex-col gap-4">
        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-alert-surface border border-alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse bg-bg-card" />
            ))}
          </div>
        ) : progress.length === 0 ? (
          <div className="p-4 rounded-2xl bg-bg-card border border-border text-sm text-text-secondary">
            Aucun élève ou aucune donnée de progression pour ce parcours.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {progress
              .slice()
              .sort((a, b) => (b.completionPercent ?? 0) - (a.completionPercent ?? 0))
              .map((s) => {
                const p = s.totalSteps ? pct(s.masteredCount, s.totalSteps) : (s.completionPercent ?? 0);
                return (
                  <button
                    key={s.studentId}
                    type="button"
                    onClick={() => navigate(`/teacher/eleve/${s.studentId}?classId=${classId}&pathId=${pathId}`)}
                    className="p-4 rounded-2xl bg-bg-card border border-border text-left hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-text-muted">
                          {s.masteredCount} / {s.totalSteps} figures maîtrisées
                        </p>
                      </div>
                      <div className="text-sm font-bold text-text-primary shrink-0">{p}%</div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={p} color="#8B2BE2" height="6px" />
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </main>

    </div>
  );
}
