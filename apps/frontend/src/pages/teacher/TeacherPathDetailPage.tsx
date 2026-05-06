import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import {
  teacherApi,
  type LearningPathSummary,
  type StudentPathProgress,
} from '../../api/teacherApi';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours/assigner' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

function pct(done: number, total: number): number {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export default function TeacherPathDetailPage() {
  const navigate = useNavigate();
  const params = useParams();

  const classId = useMemo(() => Number(params.classId), [params.classId]);
  const pathId  = useMemo(() => Number(params.pathId),  [params.pathId]);

  const [path, setPath] = useState<LearningPathSummary | null>(null);
  const [progress, setProgress] = useState<StudentPathProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  async function handleUnassign() {
    if (!Number.isFinite(classId) || !Number.isFinite(pathId)) return;
    if (isUnassigning) return;
    const ok = window.confirm('Désassigner ce parcours de la classe ?');
    if (!ok) return;

    setIsUnassigning(true);
    setError(null);
    try {
      await teacherApi.unassignPathFromClass(classId, pathId);
      navigate('/teacher/dashboard');
    } catch {
      setError("Erreur lors de la désassignation. Veuillez réessayer.");
    } finally {
      setIsUnassigning(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(classId) || !Number.isFinite(pathId)) {
      setError('Paramètres invalides.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      teacherApi.getPathById(pathId),
      teacherApi.getStudentProgress(classId, pathId),
    ])
      .then(([p, prog]) => {
        setPath(p);
        setProgress(prog);
      })
      .catch(() => setError("Impossible de charger le parcours ou la progression."))
      .finally(() => setLoading(false));
  }, [classId, pathId]);

  const classAvg = useMemo(() => {
    if (progress.length === 0) return 0;
    return Math.round(
      progress.reduce((sum, s) => sum + s.progressionPercent, 0) / progress.length
    );
  }, [progress]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
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
              onClick={() => navigate(`/teacher/parcours/assigner?classId=${classId}&pathId=${pathId}`)}
              className="text-xs px-3 py-1.5 rounded-xl bg-border border border-border text-text-secondary font-semibold"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={handleUnassign}
              disabled={isUnassigning}
              className="text-xs px-3 py-1.5 rounded-xl text-alert border border-alert/40 bg-alert/10 font-semibold disabled:opacity-60"
            >
              {isUnassigning ? '…' : 'Désassigner'}
            </button>
          </div>
        </div>

        <h1 className="font-display font-bold text-text-primary text-xl">
          {path ? path.pathName : 'Parcours'}
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Classe #{Number.isFinite(classId) ? classId : '—'} · {progress.length} élève{progress.length > 1 ? 's' : ''}
        </p>

        <div className="mt-4 p-4 rounded-2xl bg-bg-card border border-border">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest mb-1 text-text-muted">Progression moyenne</p>
              <p className="font-display text-4xl font-bold text-white">{classAvg}%</p>
            </div>
            <div className="text-xs text-text-muted text-right">
              {path?.stepCount ? `${path.stepCount} figure${path.stepCount > 1 ? 's' : ''}` : '—'}
              {path?.targetLevel ? ` · ${path.targetLevel}` : ''}
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={classAvg} color="#4068D8" height="8px" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
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
              .sort((a, b) => b.progressionPercent - a.progressionPercent)
              .map((s) => {
                const p = s.totalTricks ? pct(s.tricksCompleted, s.totalTricks) : s.progressionPercent;
                return (
                  <button
                    key={s.studentId}
                    type="button"
                    onClick={() => navigate(`/teacher/eleve/${s.studentId}`)}
                    className="p-4 rounded-2xl bg-bg-card border border-border text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-text-muted">
                          {s.tricksCompleted} / {s.totalTricks} figures maîtrisées
                        </p>
                      </div>
                      <div className="text-sm font-bold text-white shrink-0">{p}%</div>
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

      <BottomNav items={navItems} />
    </div>
  );
}

