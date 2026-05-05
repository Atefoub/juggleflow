import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import {
  teacherApi,
  GROUP_COLOR_MAP,
  GROUP_LABEL_MAP,
  type SchoolClass,
  type StudentSummary,
} from '../../api/teacherApi';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves'    },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours/assigner'  },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources'},
];

type GroupFilter = 'Tous' | 'VERT' | 'ORANGE' | 'ROUGE';

const GROUP_FILTERS: { value: GroupFilter; label: string }[] = [
  { value: 'Tous',   label: 'Tous'      },
  { value: 'VERT',   label: 'En avance' },
  { value: 'ORANGE', label: 'Normal'    },
  { value: 'ROUGE',  label: 'Attention' },
];

export default function StudentListPage() {
  const navigate = useNavigate();

  const [classes, setClasses]           = useState<SchoolClass[]>([]);
  const [students, setStudents]         = useState<StudentSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [groupFilter, setGroupFilter]   = useState<GroupFilter>('Tous');
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Load classes once
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

  // Load students when class changes
  useEffect(() => {
    if (!selectedClass) return;
    setStudents([]);
    teacherApi
      .getClassStudents(selectedClass.id)
      .then(setStudents)
      .catch(() => setError('Impossible de charger les élèves de cette classe.'));
  }, [selectedClass]);

  const filteredStudents = students.filter((s) => {
    const matchesGroup  = groupFilter === 'Tous' || s.groupColor === groupFilter;
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = normalizedSearch === '' ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(normalizedSearch);
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-1">Élèves</h1>
        <p className="text-xs text-text-secondary mb-4">
          {loading ? '…' : `${students.length} élève${students.length !== 1 ? 's' : ''}`}
        </p>

        {/* Class selector */}
        {classes.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
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

        {/* Group filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {GROUP_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setGroupFilter(value)}
              className={[
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                groupFilter === value
                  ? 'bg-teacher border-teacher text-white'
                  : 'bg-bg-card border-border text-text-muted',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-card border border-border">
          <span role="img" aria-label="recherche" className="text-sm">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élève…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="text-text-muted hover:text-text-secondary transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse bg-bg-card" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredStudents.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span role="img" aria-label="aucun résultat" className="text-4xl">🔍</span>
            <p className="text-sm text-text-muted">
              {search || groupFilter !== 'Tous'
                ? 'Aucun élève ne correspond à ces filtres.'
                : 'Aucun élève dans cette classe.'}
            </p>
            {(search || groupFilter !== 'Tous') && (
              <button
                onClick={() => { setSearch(''); setGroupFilter('Tous'); }}
                className="text-xs text-teacher underline underline-offset-2"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Student list */}
        {!loading && !error && filteredStudents.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredStudents.map((student) => {
              const chipColor = GROUP_COLOR_MAP[student.groupColor];
              return (
                <button
                  key={student.id}
                  onClick={() => navigate(`/teacher/eleve/${student.id}`)}
                  className="w-full p-4 rounded-2xl bg-bg-card border border-border text-left hover:border-teacher/60 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {/* Avatar with dynamic group color — inline style intentional (runtime value) */}
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm text-white shrink-0"
                      style={{ backgroundColor: chipColor }}
                    >
                      {student.firstName[0]}{student.lastName[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary text-sm truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {GROUP_LABEL_MAP[student.groupColor]}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-text-primary shrink-0">
                      {student.progressionPercent}%
                    </span>
                  </div>

                  {/* Progress bar — color prop is dynamic from API */}
                  <ProgressBar value={student.progressionPercent} color={chipColor} height="6px" />
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