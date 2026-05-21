import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppIcon from '../../components/icons/AppIcon';
import DifficultyChip from '../../components/catalogue/DifficultyChip';
import { PATH_LEVEL_LABELS } from '../../components/catalogue/trickLevelStyles';
import {
  teacherApi,
  type SchoolClass,
  type LearningPathSummary,
  type StudentSummary,
} from '../../api/teacherApi';

type Step = 1 | 2 | 3;

export default function AssignPathPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const preselect = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const classId = params.get('classId');
    const pathId = params.get('pathId');
    return {
      classId: classId ? Number(classId) : null,
      pathId: pathId ? Number(pathId) : null,
    };
  }, [location.search]);

  const [step, setStep]                 = useState<Step>(1);
  const [paths, setPaths]               = useState<LearningPathSummary[]>([]);
  const [selectedPath, setSelectedPath] = useState<LearningPathSummary | null>(null);
  const [levelFilter, setLevelFilter]   = useState<string>('Tous');

  const [classes, setClasses]                   = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass]       = useState<SchoolClass | null>(null);

  const [loadingPaths, setLoadingPaths]     = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classStudents, setClassStudents]   = useState<StudentSummary[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState(false);

  // Chargement des parcours réels depuis l'API
  useEffect(() => {
    teacherApi
      .getAllPaths()
      .then((p) => {
        setPaths(p);
        if (preselect.pathId) {
          const found = p.find((x) => x.id === preselect.pathId) ?? null;
          if (found) setSelectedPath(found);
        }
      })
      .catch(() => setError('Impossible de charger les parcours.'))
      .finally(() => setLoadingPaths(false));
  }, [preselect.pathId]);

  // Chargement des classes
  useEffect(() => {
    teacherApi
      .getMyClasses()
      .then((cls) => {
        setClasses(cls);
        if (preselect.classId) {
          const found = cls.find((c) => c.id === preselect.classId) ?? null;
          setSelectedClass(found ?? (cls[0] ?? null));
        } else if (cls.length > 0) {
          setSelectedClass(cls[0]);
        }
      })
      .catch(() => setError('Impossible de charger les classes.'))
      .finally(() => setLoadingClasses(false));
  }, [preselect.classId]);

  useEffect(() => {
    if (!selectedClass || step < 2) {
      setClassStudents([]);
      return;
    }
    let cancelled = false;
    setLoadingStudents(true);
    teacherApi
      .getClassStudents(selectedClass.id)
      .then((list) => {
        if (!cancelled) setClassStudents(list);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger les élèves de la classe.');
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });
    return () => { cancelled = true; };
  }, [selectedClass?.id, step]);

  // Filtrage des parcours
  const uniqueLevels = [
    'Tous',
    ...Array.from(new Set(paths.map((p) => p.targetLevel).filter(Boolean))),
  ];
  const filteredPaths = paths.filter(
    (p) => levelFilter === 'Tous' || p.targetLevel === levelFilter
  );

  async function handleSubmit() {
    if (!selectedPath || !selectedClass) return;
    setSubmitting(true);
    setError(null);
    try {
      await teacherApi.assignPathToClass(selectedClass.id, selectedPath.id);
      setSuccess(true);
      setTimeout(() => navigate('/teacher/dashboard'), 1500);
    } catch {
      setError("Erreur lors de l'assignation. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  const STEPS = ['Parcours', 'Classe', 'Confirmation'];

  const canContinue =
    step === 1 ? !!selectedPath
    : step === 2 ? !!selectedClass
    : false;

  return (
    <div className="flex flex-1 flex-col w-full min-h-0 pb-28 lg:pb-24">
      {/* Header */}
      <header className="px-5 pt-4 pb-4 lg:pt-6 lg:px-0 bg-[#0D1235] border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex items-center gap-1 text-xs text-text-muted mb-4 hover:text-text-secondary transition-colors"
        >
          ← Retour
        </button>
        <h1 className="font-display font-bold text-text-primary text-xl mb-4">
          Assigner un parcours
        </h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const current = step === n;
            return (
              <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      done    ? 'bg-success text-white'   :
                      current ? 'bg-linear-to-br from-brand to-brand-end text-white' :
                                'bg-border text-text-muted',
                    ].join(' ')}
                  >
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-[0.6rem] ${current ? 'text-text-primary' : 'text-text-muted'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mb-4 ${done ? 'bg-success' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 lg:px-0 flex flex-col gap-4 lg:max-w-3xl">
        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl text-sm text-center text-success bg-success/10 border border-success/30">
            <span className="inline-flex items-center justify-center gap-2">
              <AppIcon name="status-mastered" size={18} label="Succès" />
              Parcours assigné avec succès ! Redirection…
            </span>
          </div>
        )}

        {/* ── Step 1 : Choisir un parcours ── */}
        {step === 1 && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Étape 1 — Choisir un parcours
            </h2>

            {/* Level filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {uniqueLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={[
                    'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                    levelFilter === level
                      ? 'jf-chip-active border-transparent text-white'
                      : 'border-border bg-bg-card text-text-muted',
                  ].join(' ')}
                >
                  {level === 'Tous' ? level : (PATH_LEVEL_LABELS[level] ?? level)}
                </button>
              ))}
            </div>

            {loadingPaths ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl animate-pulse bg-bg-card" />)}
              </div>
            ) : filteredPaths.length === 0 ? (
              <div className="p-8 rounded-2xl text-center bg-bg-card border border-border">
                <p className="text-sm text-text-muted">Aucun parcours disponible pour ce niveau.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredPaths.map((path) => (
                  <button
                    key={path.id}
                    onClick={() => setSelectedPath(path)}
                    className={[
                      'w-full text-left p-4 rounded-2xl border transition-colors',
                      selectedPath?.id === path.id
                        ? 'bg-brand/10 border-brand'
                        : 'bg-bg-card border-border',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-bold text-text-primary text-sm">{path.pathName}</p>
                      {selectedPath?.id === path.id && (
                        <span className="text-brand text-lg shrink-0">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mb-2">
                      {path.stepCount} figure{path.stepCount > 1 ? 's' : ''}
                      {path.estimatedDurationDays ? ` · ${path.estimatedDurationDays} jours` : ''}
                    </p>
                    {path.targetLevel && (
                      <DifficultyChip level={path.targetLevel} />
                    )}
                    {path.description && (
                      <p className="text-xs text-text-muted mt-2 line-clamp-2">{path.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Step 2 : Choisir la classe ── */}
        {step === 2 && selectedPath && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Étape 2 — Choisir la classe
            </h2>

            <section className="p-4 rounded-2xl bg-bg-card border border-border">
              <p className="text-xs text-text-muted mb-2">Classe cible</p>
              {loadingClasses ? (
                <div className="h-10 rounded-xl animate-pulse bg-bg-input" />
              ) : classes.length === 0 ? (
                <p className="text-sm text-text-muted">Aucune classe disponible.</p>
              ) : (
                <select
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
                  value={selectedClass?.id ?? ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const found = classes.find((c) => c.id === id) ?? null;
                    setSelectedClass(found);
                  }}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.schoolYear}) — {c.studentCount} élève{c.studentCount !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              )}
            </section>

            {loadingStudents ? (
              <div className="h-24 rounded-2xl animate-pulse bg-bg-card" />
            ) : selectedClass && (
              <div className="p-4 rounded-2xl bg-bg-card border border-border">
                <p className="text-xs text-text-muted mb-2">
                  {classStudents.length} élève{classStudents.length !== 1 ? 's' : ''} recevront le parcours
                </p>
                <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto text-sm text-text-secondary">
                  {classStudents.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      {s.firstName} {s.lastName}
                    </li>
                  ))}
                  {classStudents.length > 8 && (
                    <li className="text-text-muted text-xs">
                      + {classStudents.length - 8} autres
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-brand/30 bg-[#1A1028] p-3 text-xs text-brand-end">
              Le parcours sera assigné à toute la classe sélectionnée.
            </div>
          </>
        )}

        {/* ── Step 3 : Confirmation ── */}
        {step === 3 && selectedPath && selectedClass && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Étape 3 — Confirmation
            </h2>

            <div className="p-4 rounded-2xl bg-bg-card border border-border flex flex-col gap-3">
              <div>
                <p className="text-xs text-text-muted mb-1">Parcours sélectionné</p>
                <p className="font-bold text-text-primary">{selectedPath.pathName}</p>
                <p className="text-xs text-text-muted">
                  {selectedPath.stepCount} figures
                  {selectedPath.estimatedDurationDays ? ` · ${selectedPath.estimatedDurationDays} jours` : ''}
                </p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="text-xs text-text-muted mb-1">Classe sélectionnée</p>
                <p className="font-bold text-text-primary">
                  {selectedClass?.name ?? '—'} · {selectedClass?.studentCount ?? 0} élève{(selectedClass?.studentCount ?? 0) > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-brand/30 bg-[#1A1028] p-3 text-xs text-brand-end">
              ⚡ Le parcours sera assigné à toute la classe.
            </div>
          </>
        )}
      </main>

      {/* Footer nav buttons */}
      <div className="fixed bottom-18 left-0 right-0 z-20 max-w-[430px] mx-auto px-5 pb-2 flex gap-3 bg-bg-primary border-t border-border pt-3 lg:bottom-0 lg:left-60 lg:right-0 lg:max-w-none lg:px-8 lg:py-4">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="jf-btn-secondary flex-1 min-h-11 rounded-2xl py-3 text-sm"
          >
            ← Retour
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canContinue}
            className="jf-btn-primary flex-1 min-h-11 rounded-2xl py-3 text-sm disabled:opacity-40"
          >
            Continuer →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || success}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white bg-success min-h-11 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? 'Assignation en cours…' : success ? '✓ Assigné !' : '✓ Valider l\'assignation'}
          </button>
        )}
      </div>
    </div>
  );
}
