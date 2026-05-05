import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { teacherApi, GROUP_COLOR_MAP, GROUP_LABEL_MAP, type StudentSummary } from '../../api/teacherApi';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

const MOCK_TRICKS = [
  { id: 1, name: '3 balles en cascade',  status: 'done'        },
  { id: 2, name: 'Douche à 3 balles',    status: 'in_progress' },
  { id: 3, name: '3 balles colonne',     status: 'locked'      },
  { id: 4, name: '4 balles fontaine',    status: 'locked'      },
  { id: 5, name: 'Tennis à 4 balles',   status: 'locked'      },
];

// Tailwind-compatible color classes for each status
const STATUS_CONFIG = {
  done:        { icon: '✅', label: 'Maîtrisé',   textClass: 'text-success',        bgClass: 'bg-success/10  border border-success/30'  },
  in_progress: { icon: '🔄', label: 'En cours',   textClass: 'text-cta',            bgClass: 'bg-cta/10      border border-cta/30'        },
  locked:      { icon: '🔒', label: 'Verrouillé', textClass: 'text-text-muted',     bgClass: 'bg-border/50   border border-border'        },
};

// Color map kept for the dynamic chip (group color from API — can't avoid inline here)
export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    teacherApi
      .getMyClasses()
      .then(async (classes) => {
        for (const cls of classes) {
          const students = await teacherApi.getClassStudents(cls.id);
          const found = students.find((s) => s.id === Number(id));
          if (found) {
            setStudent(found);
            return;
          }
        }
        setError('Élève introuvable.');
      })
      .catch(() => setError("Impossible de charger les données de l'élève."))
      .finally(() => setLoading(false));
  }, [id]);

  const tricksLearned   = MOCK_TRICKS.filter((t) => t.status === 'done').length;
  const daysActive      = 14;
  const progressPercent = student?.progressionPercent ?? 0;
  const groupColor      = student?.groupColor ?? 'VERT';
  const chipColor       = GROUP_COLOR_MAP[groupColor];

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
            <div className="flex items-center justify-center w-14 h-14 rounded-full font-bold text-lg text-white shrink-0 bg-teacher">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-text-primary text-base">
                {student.firstName} {student.lastName}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-text-muted">6ème A</span>
                {/* Group chip: color is dynamic from API — inline style is unavoidable */}
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ backgroundColor: chipColor }}
                >
                  {groupColor} · {GROUP_LABEL_MAP[groupColor]}
                </span>
              </div>
              <span className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-border text-text-secondary">
                <span role="img" aria-label="médaille">🎖️</span>
                Débutant
              </span>
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
                  { value: `${progressPercent}%`, label: 'Progression',        icon: '📈', iconLabel: 'progression'        },
                  { value: tricksLearned,          label: 'Figures maîtrisées', icon: '✅', iconLabel: 'figures maîtrisées' },
                  { value: `${daysActive}j`,       label: 'Jours actifs',       icon: '📅', iconLabel: 'jours actifs'       },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
                  >
                    <span role="img" aria-label={stat.iconLabel} className="text-lg">{stat.icon}</span>
                    <span className="font-display text-xl font-bold text-text-primary leading-tight">
                      {stat.value}
                    </span>
                    <span className="text-[0.6rem] text-text-muted leading-tight">{stat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Assigned path */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Parcours assigné
              </h2>

              <div className="p-4 rounded-t-2xl bg-bg-card border border-border border-b-0">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-text-primary">Parcours Débutant</span>
                  <span className="text-xs text-text-muted font-bold">{progressPercent}%</span>
                </div>
                {/* ProgressBar color is dynamic from API — prop is intentional */}
                <ProgressBar value={progressPercent} color={chipColor} height="8px" />
              </div>

              <div className="rounded-b-2xl overflow-hidden border border-border border-t-0 divide-y divide-border">
                {MOCK_TRICKS.map((trick) => {
                  const cfg = STATUS_CONFIG[trick.status as keyof typeof STATUS_CONFIG];
                  return (
                    <div key={trick.id} className="flex items-center gap-3 px-4 py-3 bg-bg-card">
                      <span role="img" aria-label={cfg.label} className="text-lg shrink-0">
                        {cfg.icon}
                      </span>
                      <span className={['text-sm flex-1', trick.status === 'locked' ? 'text-text-muted' : 'text-text-primary'].join(' ')}>
                        {trick.name}
                      </span>
                      <span className={['text-xs px-2 py-0.5 rounded-full shrink-0', cfg.textClass, cfg.bgClass].join(' ')}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Actions */}
            <section className="flex flex-col gap-3">
              <button className="w-full py-3 rounded-2xl text-sm font-semibold text-white bg-teacher min-h-11 hover:opacity-90 transition-opacity">
                Modifier le parcours assigné
              </button>
              <button className="w-full py-3 rounded-2xl text-sm font-semibold border border-border text-text-secondary bg-bg-card min-h-11 hover:opacity-80 transition-opacity">
                Changer de groupe
              </button>
            </section>
          </>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}