import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import {
  teacherApi,
  GROUP_COLOR_MAP,
  GROUP_LABEL_MAP,
  type SchoolClass,
  type StudentSummary,
  type LearningPathSummary,
} from '../../api/teacherApi';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours/assigner' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

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
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [assignedPaths, setAssignedPaths] = useState<LearningPathSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [pathsError, setPathsError] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedClass) return;
    setStudents([]);
    setAssignedPaths([]);
    setLoadingPaths(true);
    setPathsError(null);
    teacherApi
      .getClassStudents(selectedClass.id)
      .then(setStudents)
      .catch(() => setError('Impossible de charger les élèves de cette classe.'));

    teacherApi
      .getAssignedPathsForClass(selectedClass.id)
      .then(setAssignedPaths)
      .catch(() => setPathsError("Impossible de charger les parcours de cette classe."))
      .finally(() => setLoadingPaths(false));
  }, [selectedClass]);

  async function handleUnassign(pathId: number) {
    if (!selectedClass) return;
    const ok = window.confirm('Désassigner ce parcours de la classe ?');
    if (!ok) return;

    try {
      await teacherApi.unassignPathFromClass(selectedClass.id, pathId);
      const refreshed = await teacherApi.getAssignedPathsForClass(selectedClass.id);
      setAssignedPaths(refreshed);
    } catch {
      setPathsError("Erreur lors de la désassignation. Veuillez réessayer.");
    }
  }

  const groups          = groupStudents(students);
  const avgProgress     = averageProgress(students);
  const blockedStudents = students.filter((s) => s.groupColor === 'ROUGE');

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl font-bold text-white shrink-0 text-xs bg-teacher">
            Prof
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-white text-sm">
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </p>
            {selectedClass && (
              <p className="text-xs text-text-muted">
                {selectedClass.name} · {selectedClass.studentCount} élève{selectedClass.studentCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={logout}
            className="text-xs px-3 py-1 rounded-lg bg-border text-text-secondary"
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
                  'shrink-0 px-3 py-1 rounded-lg text-xs font-semibold border border-border',
                  selectedClass?.id === cls.id
                    ? 'bg-teacher text-white'
                    : 'bg-border text-text-secondary',
                ].join(' ')}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Erreur */}
        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse bg-bg-card" />
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Progression moyenne */}
            <div className="p-4 rounded-2xl flex items-center gap-4 bg-bg-card border border-border">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest mb-1 text-text-muted">
                  Progression moyenne
                </p>
                <p className="font-display text-4xl font-bold text-white">{avgProgress}%</p>
                <p className="text-xs mt-1 text-text-secondary">
                  {students.length} élève{students.length > 1 ? 's' : ''} dans la classe
                </p>
              </div>
              <div className="flex items-center justify-center w-18 h-18 rounded-full shrink-0 border-4 border-brand text-xs font-bold text-white">
                {avgProgress}%
              </div>
            </div>

            {/* Groupes d'élèves */}
            {students.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
                  Groupes d'élèves
                </h2>
                <div className="rounded-2xl overflow-hidden border border-border">
                  {(['VERT', 'ORANGE', 'ROUGE'] as const)
                    .filter((color) => groups[color].length > 0)
                    .map((color, index, arr) => {
                      const group = groups[color];
                      const avg = averageProgress(group);
                      return (
                        <div
                          key={color}
                          className="flex items-center gap-3 p-4 bg-bg-card"
                          style={{ borderBottom: index < arr.length - 1 ? '1px solid #1E2847' : 'none' }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: GROUP_COLOR_MAP[color] }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white">
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
                            <span className="text-sm font-bold text-white min-w-8 text-right">
                              {avg}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Alerte élèves bloqués */}
            {blockedStudents.length > 0 && (
              <div className="p-4 rounded-2xl flex items-start gap-3 bg-[#1A1020] border border-[#2A1A10] border-l-[3px] border-l-cta">
                <span role="img" aria-label="attention" className="text-lg shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-1">
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
                    onClick={() => navigate(`/teacher/eleves?classId=${selectedClass.id}&group=ROUGE`)}
                    className="shrink-0 text-xs font-semibold text-cta underline underline-offset-2"
                  >
                    Voir le détail →
                  </button>
                )}
              </div>
            )}

            {/* Parcours assignés */}
            {selectedClass && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider">
                    Parcours assignés
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/parcours/assigner?classId=${selectedClass.id}`)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-teacher text-white font-semibold"
                  >
                    + Assigner
                  </button>
                </div>

                {pathsError && (
                  <div className="p-3 rounded-2xl text-xs text-alert bg-[#2A1020] border border-alert mb-3">
                    {pathsError}
                  </div>
                )}

                {loadingPaths ? (
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
                  <div className="flex flex-col gap-2">
                    {assignedPaths.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl bg-bg-card border border-border flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{p.pathName}</p>
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
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-border border border-border text-text-secondary"
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
              <div className="p-4 rounded-2xl text-sm bg-bg-card border border-border text-text-secondary">
                Vous n'avez pas encore de classe. Créez-en une pour commencer.
              </div>
            )}

            {/* Actions rapides */}
            <div>
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
                Actions rapides
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedClass) navigate(`/teacher/parcours/assigner?classId=${selectedClass.id}`);
                    else navigate('/teacher/parcours/assigner');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold min-h-11 bg-bg-card border-[1.5px] border-border text-text-secondary"
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
                    const pathId = assignedPaths[0].id;
                    navigate(`/teacher/classe/${selectedClass.id}/parcours/${pathId}?download=csv`);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold min-h-11 bg-bg-card border-[1.5px] border-border text-text-secondary"
                >
                  ↓ Générer rapport
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/teacher/eleves')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold min-h-11 bg-bg-card border-[1.5px] border-border text-text-secondary"
                >
                  + Ajouter un élève
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav items={navItems} />
    </div>
  );
}