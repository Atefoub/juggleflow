import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProgressBar from '../../components/ProgressBar';
import AppIcon from '../../components/icons/AppIcon';
import StudentPathSummary from '../../components/teacher/StudentPathSummary';
import {
  teacherApi,
  GROUP_COLOR_MAP,
  GROUP_LABEL_MAP,
  type SchoolClass,
  type StudentSummary,
} from '../../api/teacherApi';
import { useTeacherClassData } from '../../hooks/useTeacherClassData';

function groupStudents(students: StudentSummary[]) {
  const groups: Record<StudentSummary['groupColor'], StudentSummary[]> = {
    VERT: [], ORANGE: [], ROUGE: [],
  };
  for (const s of students) {
    groups[s.groupColor].push(s);
  }
  return groups;
}

function averageProgress(students: StudentSummary[]): number {
  if (students.length === 0) return 0;
  return Math.round(
    students.reduce((sum, s) => sum + s.progressionPercent, 0) / students.length
  );
}

export default function TeacherDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses]   = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [loading, setLoading]   = useState(true);
  const [pathsError, setPathsError] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [reportPickerOpen, setReportPickerOpen] = useState(false);

  const {
    students,
    assignedPaths,
    pathOverview,
    loading: classDataLoading,
    error: classDataError,
    reload: reloadClassData,
  } = useTeacherClassData(selectedClass?.id ?? null);

  useEffect(() => {
    teacherApi
      .getMyClasses()
      .then((cls) => {
        setClasses(cls);
        if (cls.length > 0) setSelectedClass(cls[0]);
      })
      .catch(() => setError('Impossible de charger vos classes.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleUnassign(pathId: number) {
    if (!selectedClass) return;
    const ok = window.confirm('Désassigner ce parcours de la classe ?');
    if (!ok) return;

    try {
      await teacherApi.unassignPathFromClass(selectedClass.id, pathId);
      setPathsError(null);
      await reloadClassData();
    } catch {
      setPathsError("Erreur lors de la désassignation. Veuillez réessayer.");
    }
  }

  const groups          = groupStudents(students);
  const avgProgress     = averageProgress(students);
  const blockedStudents = students.filter((s) => s.groupColor === 'ROUGE');
  const exerciseBlockedStudents = students.filter((s) => s.blocked);
  const sortedAssignedPaths = useMemo(
    () => assignedPaths.slice().sort((a, b) => a.pathName.localeCompare(b.pathName, 'fr')),
    [assignedPaths]
  );

  return (
    <div className="flex flex-1 flex-col w-full min-h-0">

      {/* Header */}
      <div className="px-5 pt-4 pb-4 lg:pt-6 lg:px-0 bg-bg-header border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand to-brand-end text-xs font-bold text-white">
            Prof
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-text-primary text-sm">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </p>
            {selectedClass && (
              <p className="text-xs text-text-muted">
                {selectedClass.name} · {selectedClass.studentCount} élève{selectedClass.studentCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={logout}
            className="jf-btn-secondary jf-btn-secondary-sm"
          >
            Quitter
          </button>
        </div>

        {/* Sélecteur de classe si plusieurs */}
        {classes.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={[
                  'shrink-0 rounded-lg border px-3 py-1 text-xs font-semibold',
                  selectedClass?.id === cls.id
                    ? 'jf-chip-active border-transparent text-white'
                    : 'border-border bg-border text-text-secondary',
                ].join(' ')}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-5 py-4 lg:px-0 flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">

        {/* Erreur */}
        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-alert-surface border border-alert lg:col-span-2">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3 lg:col-span-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse bg-bg-card" />
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Progression moyenne */}
            <div className="p-4 rounded-2xl flex items-center gap-4 bg-bg-card border border-border lg:col-span-1">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest mb-1 text-text-muted">
                  Progression moyenne
                </p>
                <p className="font-display text-4xl font-bold text-text-primary">{avgProgress}%</p>
                <p className="text-xs mt-1 text-text-secondary">
                  {students.length} élève{students.length > 1 ? 's' : ''} dans la classe
                </p>
              </div>
              <div className="flex items-center justify-center w-18 h-18 rounded-full shrink-0 border-4 border-brand text-xs font-bold text-text-primary">
                {avgProgress}%
              </div>
            </div>

            {/* Groupes d'élèves */}
            {students.length > 0 && (
              <div className="lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                    Groupes d'élèves
                  </h2>
                  {selectedClass && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/teacher/groupes?classId=${selectedClass.id}`)
                      }
                      className="text-xs font-semibold text-brand-end underline underline-offset-2"
                    >
                      Modifier →
                    </button>
                  )}
                </div>
                <div className="rounded-2xl overflow-hidden border border-border divide-y divide-border">
                  {(['VERT', 'ORANGE', 'ROUGE'] as const)
                    .filter((color) => groups[color].length > 0)
                    .map((color) => {
                      const group = groups[color];
                      const avg = averageProgress(group);
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() =>
                            selectedClass &&
                            navigate(
                              `/teacher/groupes?classId=${selectedClass.id}&group=${color}`,
                            )
                          }
                          className="flex w-full items-center gap-3 p-4 bg-bg-card text-left transition-colors hover:bg-surface-hover"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: GROUP_COLOR_MAP[color] }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-text-primary">
                              Groupe {color.charAt(0) + color.slice(1).toLowerCase()}
                            </p>
                            <p className="text-xs text-text-muted">
                              {group.length} élève{group.length > 1 ? 's' : ''} · {GROUP_LABEL_MAP[color]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-17.5">
                              <ProgressBar value={avg} color={GROUP_COLOR_MAP[color]} height="6px" />
                            </div>
                            <span className="text-sm font-bold text-text-primary min-w-8 text-right">
                              {avg}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Alerte blocage sur figure (parcours) */}
            {exerciseBlockedStudents.length > 0 && selectedClass && (
              <div className="flex items-start gap-3 rounded-2xl border border-border border-l-[3px] border-l-brand-end bg-accent-surface p-4 lg:col-span-2">
                <AppIcon name="alert-warning" size={20} className="shrink-0" label="Attention" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary mb-1">
                    {exerciseBlockedStudents.length} élève{exerciseBlockedStudents.length > 1 ? 's' : ''}{' '}
                    bloqué{exerciseBlockedStudents.length > 1 ? 's' : ''} sur une figure
                  </p>
                  <p className="text-xs text-text-secondary">
                    {exerciseBlockedStudents
                      .slice(0, 3)
                      .map((s) =>
                        `${s.firstName} ${s.lastName[0]}. (${s.blockedTrickName ?? 'figure'})`,
                      )
                      .join(', ')}
                    {exerciseBlockedStudents.length > 3 &&
                      ` +${exerciseBlockedStudents.length - 3} autres`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/teacher/eleves?classId=${selectedClass.id}`)}
                  className="shrink-0 text-xs font-semibold text-brand-end underline underline-offset-2"
                >
                  Voir les élèves →
                </button>
              </div>
            )}

            {/* Alerte élèves en difficulté (groupe rouge) */}
            {blockedStudents.length > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-border border-l-[3px] border-l-brand-end bg-accent-surface p-4 lg:col-span-2">
                <AppIcon name="alert-warning" size={20} className="shrink-0" label="Attention" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary mb-1">
                    {blockedStudents.length} élève{blockedStudents.length > 1 ? 's' : ''} en difficulté
                  </p>
                  <p className="text-xs text-text-secondary">
                    {blockedStudents
                      .slice(0, 3)
                      .map((s) => `${s.firstName} ${s.lastName[0]}.`)
                      .join(', ')}
                    {blockedStudents.length > 3 && ` +${blockedStudents.length - 3} autres`}
                  </p>
                </div>
                {selectedClass && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/teacher/groupes?classId=${selectedClass.id}&group=ROUGE`)
                    }
                    className="shrink-0 text-xs font-semibold text-brand-end underline underline-offset-2"
                  >
                    Voir le détail →
                  </button>
                )}
              </div>
            )}

            {/* Parcours effectif par élève */}
            {selectedClass && students.length > 0 && (
              <section className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                    Parcours par élève
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/eleves?classId=${selectedClass.id}`)}
                    className="text-xs font-semibold text-brand-end underline underline-offset-2"
                  >
                    Liste complète →
                  </button>
                </div>

                {classDataLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 rounded-xl animate-pulse bg-bg-card" />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden border border-border divide-y divide-border max-h-64 overflow-y-auto">
                    {students.map((s) => {
                      const row = pathOverview.get(s.id);
                      const chipColor = GROUP_COLOR_MAP[s.groupColor];
                      const pct = row?.pathName ? row.completionPercent : s.progressionPercent;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            navigate(`/teacher/eleve/${s.id}?classId=${selectedClass.id}`)
                          }
                          className="flex w-full items-center gap-3 px-4 py-3 bg-bg-card text-left transition-colors hover:bg-surface-hover"
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: chipColor }}
                          >
                            {s.firstName[0]}{s.lastName[0]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary truncate">
                              {s.firstName} {s.lastName}
                            </p>
                            <StudentPathSummary overview={row} />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-16 hidden sm:block">
                              <ProgressBar value={pct} color={chipColor} height="4px" />
                            </div>
                            <span className="text-sm font-bold text-text-primary min-w-9 text-right">
                              {pct}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Parcours assignés */}
            {selectedClass && (
              <section className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                    Parcours assignés
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/parcours/assigner?classId=${selectedClass.id}`)}
                    className="jf-btn-primary jf-btn-primary-sm rounded-xl"
                  >
                    + Assigner
                  </button>
                </div>

                {(pathsError ?? classDataError) && (
                  <div className="p-3 rounded-2xl text-xs text-alert bg-alert-surface border border-alert mb-3">
                    {pathsError ?? classDataError}
                  </div>
                )}

                {classDataLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 rounded-2xl animate-pulse bg-bg-card" />
                    ))}
                  </div>
                ) : assignedPaths.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-bg-card border border-border text-sm text-text-secondary">
                    Aucun parcours assigné pour l'instant.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
                    {assignedPaths.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl bg-bg-card border border-border flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate">{p.pathName}</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {p.stepCount} figure{p.stepCount > 1 ? 's' : ''}
                            {p.estimatedDurationDays ? ` · ~${p.estimatedDurationDays} jours` : ''}
                            {p.targetLevel ? ` · ${p.targetLevel}` : ''}
                          </p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/classe/${selectedClass.id}/parcours/${p.id}`)}
                            className="jf-btn-secondary jf-btn-secondary-sm rounded-xl"
                          >
                            Voir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnassign(p.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-alert border border-alert/40 bg-alert/10"
                          >
                            Désassigner
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Aucune classe */}
            {classes.length === 0 && (
              <div className="p-4 rounded-2xl text-sm bg-bg-card border border-border text-text-secondary lg:col-span-2">
                Vous n'avez pas encore de classe. Créez-en une pour commencer.
              </div>
            )}

            {/* Actions rapides */}
            <div className="lg:col-span-2">
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Actions rapides
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedClass) navigate(`/teacher/parcours/assigner?classId=${selectedClass.id}`);
                    else navigate('/teacher/parcours/assigner');
                  }}
                  className="jf-btn-secondary jf-btn-secondary-sm min-h-11 rounded-xl px-4 py-2 text-xs"
                >
                  + Assigner un parcours
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedClass) return;
                    if (assignedPaths.length === 0) {
                      setPathsError("Aucun parcours n'est assigné à cette classe.");
                      return;
                    }
                    if (assignedPaths.length === 1) {
                      const pathId = assignedPaths[0].id;
                      navigate(`/teacher/classe/${selectedClass.id}/parcours/${pathId}?download=csv`);
                      return;
                    }
                    setPathsError(null);
                    setReportPickerOpen(true);
                  }}
                  className="jf-btn-secondary jf-btn-secondary-sm min-h-11 rounded-xl px-4 py-2 text-xs"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <AppIcon name="download" size={14} label="Générer rapport" />
                    Générer rapport
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    selectedClass
                      ? navigate(`/teacher/eleves?classId=${selectedClass.id}`)
                      : navigate('/teacher/eleves')
                  }
                  className="jf-btn-secondary jf-btn-secondary-sm min-h-11 rounded-xl px-4 py-2 text-xs"
                >
                  + Ajouter un élève
                </button>
              </div>
            </div>

            {/* Sélection du parcours pour le rapport */}
            {reportPickerOpen && selectedClass && sortedAssignedPaths.length > 1 && (
              <section className="p-4 rounded-2xl bg-bg-card border border-border lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                    Choisir un parcours
                  </h3>
                  <button
                    type="button"
                    onClick={() => setReportPickerOpen(false)}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {sortedAssignedPaths.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setReportPickerOpen(false);
                        navigate(`/teacher/classe/${selectedClass.id}/parcours/${p.id}?download=csv`);
                      }}
                      className="w-full p-3 rounded-xl bg-bg-primary border border-border text-left hover:opacity-90 transition-opacity"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate">{p.pathName}</p>
                          <p className="text-xs text-text-muted">
                            {p.stepCount} figure{p.stepCount > 1 ? 's' : ''}
                            {p.targetLevel ? ` · ${p.targetLevel}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-brand-end">CSV →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}


