import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import { teacherApi, GROUP_COLOR_MAP, type SchoolClass, type StudentSummary } from '../../api/teacherApi';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

// Mock paths (à remplacer par un appel API /paths)
const MOCK_PATHS = [
  { id: 1, name: 'Fondamentaux — 3 balles',   tricks: 16, cycle: 'Cycle 2', weeks: 6,  level: 'Débutant',      levels: ['CE1', 'CE2'] },
  { id: 2, name: 'Foulards — Initiation',      tricks: 10, cycle: 'Cycle 1', weeks: 4,  level: 'Débutant',      levels: ['GS', 'CP']   },
  { id: 3, name: 'Figures avancées — Cycle 3', tricks: 22, cycle: 'Cycle 3', weeks: 10, level: 'Intermédiaire', levels: ['CM1', 'CM2'] },
];

type LevelFilter = 'Tous' | 'Débutant' | 'Intermédiaire' | 'Avancé';

const LEVEL_CHIP: Record<string, string> = {
  'Débutant':      'text-success  bg-success/10  border border-success/30',
  'Intermédiaire': 'text-cta      bg-cta/10      border border-cta/30',
  'Avancé':        'text-brand    bg-brand/10    border border-brand/30',
};

type Step = 1 | 2 | 3;

export default function AssignPathPage() {
  const navigate = useNavigate();

  const [step, setStep]               = useState<Step>(1);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('Tous');
  const [selectedPath, setSelectedPath] = useState<typeof MOCK_PATHS[0] | null>(null);

  const [classes, setClasses]           = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [students, setStudents]         = useState<StudentSummary[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    teacherApi.getMyClasses()
      .then((cls) => { setClasses(cls); if (cls.length > 0) setSelectedClass(cls[0]); })
      .catch(() => setError('Impossible de charger les classes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    teacherApi.getClassStudents(selectedClass.id).then(setStudents).catch(() => {});
  }, [selectedClass]);

  const filteredPaths = MOCK_PATHS.filter(
    (p) => levelFilter === 'Tous' || p.level === levelFilter
  );

  function toggleStudent(id: number) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedStudentIds(new Set(students.map((s) => s.id)));
  }

  const STEPS = ['Parcours', 'Élèves', 'Confirmation'];

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex items-center gap-1 text-xs text-text-muted mb-4 hover:text-text-secondary transition-colors"
        >
          ← Retour
        </button>
        <h1 className="font-display font-bold text-text-primary text-xl mb-4">Assigner un parcours</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Step;
            const done    = step > n;
            const current = step === n;
            return (
              <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    done    ? 'bg-success text-white' :
                    current ? 'bg-brand text-white'  :
                              'bg-border text-text-muted',
                  ].join(' ')}>
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

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {/* ── Step 1 : Choisir un parcours ── */}
        {step === 1 && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Étape 1 — Choisir un parcours
            </h2>

            {/* Level filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['Tous', 'Débutant', 'Intermédiaire', 'Avancé'] as LevelFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setLevelFilter(f)}
                  className={[
                    'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    levelFilter === f
                      ? 'bg-brand border-brand text-white'
                      : 'bg-bg-card border-border text-text-muted',
                  ].join(' ')}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Path list */}
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
                    <p className="font-bold text-text-primary text-sm">{path.name}</p>
                    {selectedPath?.id === path.id && (
                      <span className="text-brand text-lg shrink-0">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mb-2">
                    {path.tricks} figures · {path.cycle} · {path.weeks} semaines
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${LEVEL_CHIP[path.level] ?? ''}`}>
                      {path.level}
                    </span>
                    {path.levels.map((l) => (
                      <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-border text-text-muted">{l}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2 : Choisir les élèves ── */}
        {step === 2 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
                Étape 2 — Choisir les élèves
              </h2>
              <button onClick={selectAll} className="text-xs text-brand underline">Tous</button>
            </div>

            {/* Class selector */}
            {classes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    className={[
                      'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border',
                      selectedClass?.id === cls.id
                        ? 'bg-teacher border-teacher text-white'
                        : 'bg-bg-card border-border text-text-muted',
                    ].join(' ')}
                  >
                    {cls.name}
                  </button>
                ))}
              </div>
            )}

            {/* Selected chips */}
            {selectedStudentIds.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {students
                  .filter((s) => selectedStudentIds.has(s.id))
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-brand/20 border border-brand text-xs text-brand"
                    >
                      {s.firstName} {s.lastName[0]}.
                      <span aria-label="Retirer" className="ml-0.5 opacity-70">×</span>
                    </button>
                  ))}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl animate-pulse bg-bg-card" />)}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {students.map((s) => {
                  const selected = selectedStudentIds.has(s.id);
                  const color    = GROUP_COLOR_MAP[s.groupColor];
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={[
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                        selected ? 'bg-brand/10 border-brand' : 'bg-bg-card border-border',
                      ].join(' ')}
                    >
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-text-primary">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-text-muted">{s.progressionPercent}% de progression</p>
                      </div>
                      <div className={[
                        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                        selected ? 'bg-brand border-brand' : 'bg-transparent border-border',
                      ].join(' ')}>
                        {selected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Step 3 : Confirmation ── */}
        {step === 3 && selectedPath && (
          <>
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Étape 3 — Confirmation
            </h2>

            <div className="p-4 rounded-2xl bg-bg-card border border-border flex flex-col gap-3">
              <div>
                <p className="text-xs text-text-muted mb-1">Parcours sélectionné</p>
                <p className="font-bold text-text-primary">{selectedPath.name}</p>
                <p className="text-xs text-text-muted">{selectedPath.tricks} figures · {selectedPath.weeks} semaines</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="text-xs text-text-muted mb-1">Élèves sélectionnés</p>
                <p className="font-bold text-text-primary">{selectedStudentIds.size} élève{selectedStudentIds.size > 1 ? 's' : ''}</p>
                <p className="text-xs text-text-muted">
                  {students
                    .filter((s) => selectedStudentIds.has(s.id))
                    .slice(0, 4)
                    .map((s) => `${s.firstName} ${s.lastName[0]}.`)
                    .join(', ')}
                  {selectedStudentIds.size > 4 && ` +${selectedStudentIds.size - 4} autres`}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1A1020] border border-cta/30 text-xs text-cta">
              Le parcours sera disponible immédiatement dans le tableau de bord des élèves sélectionnés.
            </div>
          </>
        )}
      </main>

      {/* Footer nav buttons */}
      <div className="fixed bottom-18 left-0 right-0 max-w-107.5 mx-auto px-5 pb-2 flex gap-3 bg-bg-primary border-t border-border pt-3">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold border border-border text-text-secondary bg-bg-card min-h-11"
          >
            ← Retour
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={step === 1 ? !selectedPath : selectedStudentIds.size === 0}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white bg-teacher min-h-11 disabled:opacity-40"
          >
            {step === 1 ? 'Continuer — Choisir les élèves →' : 'Continuer — Confirmation →'}
          </button>
        ) : (
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white bg-success min-h-11 hover:opacity-90 transition-opacity"
          >
            ✓ Valider l'assignation
          </button>
        )}
      </div>

      <BottomNav items={navItems} />
    </div>
  );
}