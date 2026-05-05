import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import {
  teacherApi,
  GROUP_COLOR_MAP,
  GROUP_LABEL_MAP,
  type StudentSummary,
  type LearningPathSummary,
} from '../../api/teacherApi';
import { studentApi, type TrickProgress } from '../../api/studentApi';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours/assigner' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

const STATUS_CONFIG = {
  MASTERED:    { icon: '✅', label: 'Maîtrisé',   textClass: 'text-success',    bgClass: 'bg-success/10  border border-success/30'  },
  IN_PROGRESS: { icon: '🔄', label: 'En cours',   textClass: 'text-cta',        bgClass: 'bg-cta/10      border border-cta/30'        },
  NOT_STARTED: { icon: '🔒', label: 'Non commencé', textClass: 'text-text-muted', bgClass: 'bg-border/50   border border-border'        },
} as const;

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent]   = useState<StudentSummary | null>(null);
  const [paths, setPaths]       = useState<LearningPathSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Groupe de couleur
  const groupColor  = student?.groupColor ?? 'VERT';
  const chipColor   = GROUP_COLOR_MAP[groupColor];
  const progressPct = student?.progressionPercent ?? 0;

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Trouver l'élève dans toutes les classes
        const classes = await teacherApi.getMyClasses();
        let found: StudentSummary | null = null;
        for (const cls of classes) {
          const students = await teacherApi.getClassStudents(cls.id);
          found = students.find((s) => s.id === Number(id)) ?? null;
          if (found) break;
        }
        if (!found) {
          setError('Élève introuvable.');
          return;
        }
        setStudent(found);

        // 2. Charger les parcours disponibles
        const allPaths = await teacherApi.getAllPaths();
        setPaths(allPaths);
      } catch {
        setError("Impossible de charger les données de l'élève.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Calculs à partir des données disponibles
  const tricksLearned   = 0; // sera affiché depuis l'API
  const daysActive      = student?.lastActivityAt
    ? Math.max(1, Math.ceil((Date.now() - new Date(student.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-5 bg-[#0D1235] border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex items-center gap-1 text-xs text-text-muted mb-4 hover:text-text-secondary transition-colors"
        >
          ← Retour
        </button>

        {loading ? (
          <div className="h-16 rounded-2xl animate-pulse bg-bg-card" />
        ) : student ? (
          <div className="flex items-start gap-4">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full font-bold text-lg text-white shrink-0"
              style={{ backgroundColor: chipColor }}
            >
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-text-primary text-base">
                {student.firstName} {student.lastName}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ backgroundColor: chipColor }}
                >
                  {GROUP_LABEL_MAP[groupColor]}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {student.lastActivityAt
                  ? `Dernière activité : ${new Date(student.lastActivityAt).toLocaleDateString('fr-FR')}`
                  : 'Aucune activité récente'}
              </p>
            </div>
          </div>
        ) : null}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

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

        {!loading && !error && student && (
          <>
            {/* KPIs */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Statistiques
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: `${progressPct}%`, label: 'Progression',      icon: '📈', iconLabel: 'progression'   },
                  { value: student.groupColor === 'VERT' ? 'Avance' : student.groupColor === 'ORANGE' ? 'Normal' : '⚠️ Attention', label: 'Groupe', icon: '🎯', iconLabel: 'groupe' },
                  { value: student.lastActivityAt ? new Date(student.lastActivityAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—', label: 'Dernière activité', icon: '📅', iconLabel: 'dernière activité' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
                  >
                    <span role="img" aria-label={stat.iconLabel} className="text-lg">{stat.icon}</span>
                    <span className="font-display text-base font-bold text-text-primary leading-tight">
                      {stat.value}
                    </span>
                    <span className="text-[0.6rem] text-text-muted leading-tight">{stat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Progression globale */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Progression globale
              </h2>
              <div className="p-4 rounded-2xl bg-bg-card border border-border">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-text-primary">{progressPct}% complété</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: chipColor }}
                  >
                    {GROUP_LABEL_MAP[groupColor]}
                  </span>
                </div>
                <ProgressBar value={progressPct} color={chipColor} height="10px" />
              </div>
            </section>

            {/* Parcours disponibles */}
            {paths.length > 0 && (
              <section>
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                  Parcours disponibles
                </h2>
                <div className="flex flex-col gap-3">
                  {paths.slice(0, 3).map((path) => (
                    <div key={path.id} className="p-4 rounded-2xl bg-bg-card border border-border">
                      <div className="flex justify-between mb-1">
                        <p className="font-bold text-text-primary text-sm">{path.pathName}</p>
                        {path.targetLevel && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-border text-text-muted">
                            {path.targetLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {path.stepCount} figure{path.stepCount > 1 ? 's' : ''}
                        {path.estimatedDurationDays ? ` · ${path.estimatedDurationDays} jours` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Actions */}
            <section className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (classId) params.set('classId', String(classId));
                  if (student?.id) params.set('studentId', String(student.id));
                  if (selectedPathId) params.set('pathId', String(selectedPathId));
                  navigate(`/teacher/parcours/assigner?${params.toString()}`);
                }}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white bg-teacher min-h-11 hover:opacity-90 transition-opacity"
              >
                Assigner un parcours à cet élève
              </button>
              <button
                type="button"
                onClick={() => navigate('/teacher/eleves')}
                className="w-full py-3 rounded-2xl text-sm font-semibold border border-border text-text-secondary bg-bg-card min-h-11 hover:opacity-80 transition-opacity"
              >
                Voir la liste des élèves
              </button>
            </section>
          </>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
