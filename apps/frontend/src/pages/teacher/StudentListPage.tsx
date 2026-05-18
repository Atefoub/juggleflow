import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import {
  teacherApi,
  GROUP_COLOR_MAP,
  GROUP_LABEL_MAP,
  type SchoolClass,
  type StudentLookup,
  type StudentSummary,
} from '../../api/teacherApi';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

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
  const location = useLocation();

  const preselect = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const classId = params.get('classId');
    const group = params.get('group');
    return {
      classId: classId ? Number(classId) : null,
      group: (group === 'VERT' || group === 'ORANGE' || group === 'ROUGE') ? group : null,
    };
  }, [location.search]);

  const [classes, setClasses]           = useState<SchoolClass[]>([]);
  const [students, setStudents]         = useState<StudentSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [groupFilter, setGroupFilter]   = useState<GroupFilter>('Tous');
  const [search, setSearch]             = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [lookupPreview, setLookupPreview] = useState<StudentLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Load classes once
  useEffect(() => {
    teacherApi
      .getMyClasses()
      .then((cls) => {
        setClasses(cls);
        if (cls.length === 0) return;
        if (preselect.classId) {
          const found = cls.find((c) => c.id === preselect.classId) ?? null;
          setSelectedClass(found ?? cls[0]);
        } else {
          setSelectedClass(cls[0]);
        }
      })
      .catch(() => setError('Impossible de charger vos classes.'))
      .finally(() => setLoading(false));
  }, [preselect.classId]);

  useEffect(() => {
    if (preselect.group) setGroupFilter(preselect.group);
  }, [preselect.group]);

  // Load students when class changes
  useEffect(() => {
    if (!selectedClass) return;
    setStudents([]);
    teacherApi
      .getClassStudents(selectedClass.id)
      .then(setStudents)
      .catch(() => setError('Impossible de charger les élèves de cette classe.'));
  }, [selectedClass]);

  useEffect(() => {
    setLookupPreview(null);
    setLookupLoading(false);
  }, [addQuery, selectedClass?.id]);

  const looksLikeEmail = addQuery.includes('@');

  const filteredStudents = useMemo(() => students.filter((s) => {
    const matchesGroup  = groupFilter === 'Tous' || s.groupColor === groupFilter;
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = normalizedSearch === '' ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(normalizedSearch);
    return matchesGroup && matchesSearch;
  }), [students, groupFilter, search]);

  async function handleLookupStudent() {
    if (!selectedClass || !looksLikeEmail) return;
    setLookupLoading(true);
    setError(null);
    setLookupPreview(null);
    try {
      const result = await teacherApi.lookupStudent(addQuery, selectedClass.id);
      setLookupPreview(result);
      if (result.alreadyInClass) {
        setError('Cet élève est déjà inscrit dans cette classe.');
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Aucun compte élève trouvé pour cet e-mail.'));
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleAddStudent() {
    if (!selectedClass) return;

    let studentId: number | null = lookupPreview?.id ?? null;
    if (studentId == null) {
      const parsed = Number(addQuery.trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError(
          looksLikeEmail
            ? 'Recherche d\'abord l\'élève par e-mail, puis confirme l\'ajout.'
            : 'ID élève invalide. Utilise un nombre (ex. 12) ou un e-mail.',
        );
        return;
      }
      studentId = parsed;
    }

    if (lookupPreview?.alreadyInClass) {
      setError('Cet élève est déjà inscrit dans cette classe.');
      return;
    }

    setAddingStudent(true);
    setError(null);
    try {
      await teacherApi.addStudentToClass(selectedClass.id, studentId);
      const updated = await teacherApi.getClassStudents(selectedClass.id);
      setStudents(updated);
      setAddQuery('');
      setLookupPreview(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d'ajouter cet élève."));
    } finally {
      setAddingStudent(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h1 className="font-display font-bold text-text-primary text-2xl">Élèves</h1>
            <p className="text-xs text-text-secondary mt-1">
              {loading ? '…' : `${students.length} élève${students.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() =>
                selectedClass
                  ? navigate(`/teacher/groupes?classId=${selectedClass.id}`)
                  : navigate('/teacher/groupes')
              }
              className="jf-btn-secondary jf-btn-secondary-sm min-h-11 rounded-xl px-3 py-2 text-xs"
            >
              Groupes
            </button>
            <button
              type="button"
              onClick={() => navigate('/teacher/parcours/assigner')}
              className="jf-btn-secondary jf-btn-secondary-sm min-h-11 rounded-xl px-3 py-2 text-xs"
            >
              + Assigner
            </button>
          </div>
        </div>

        {/* Ajouter un élève */}
        <div className="mb-4 flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-secondary" htmlFor="add-student-query">
            Ajouter un élève
          </label>
          <div className="flex items-center gap-2">
            <input
              id="add-student-query"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="E-mail ou ID (ex. lucas.martin@ecole.fr)"
              autoComplete="off"
              className="flex-1 px-4 py-3 rounded-xl outline-none text-sm min-h-12 bg-bg-input text-text-primary border-[1.5px] border-border"
            />
            {looksLikeEmail && !lookupPreview ? (
              <button
                type="button"
                disabled={lookupLoading || !selectedClass || !addQuery.trim()}
                onClick={() => void handleLookupStudent()}
                className="jf-btn-secondary min-h-12 shrink-0 rounded-xl px-4 py-3 text-sm disabled:opacity-50"
              >
                {lookupLoading ? '…' : 'Rechercher'}
              </button>
            ) : (
              <button
                type="button"
                disabled={addingStudent || !selectedClass || !addQuery.trim()}
                onClick={() => void handleAddStudent()}
                className="jf-btn-primary min-h-12 shrink-0 rounded-xl px-4 py-3 text-sm disabled:opacity-50"
              >
                {addingStudent ? 'Ajout…' : '+ Ajouter'}
              </button>
            )}
          </div>

          {lookupPreview && !lookupPreview.alreadyInClass && (
            <div className="rounded-xl border border-brand/40 bg-bg-card p-3 flex flex-col gap-2">
              <p className="text-sm font-semibold text-text-primary">
                {lookupPreview.firstName} {lookupPreview.lastName}
              </p>
              <p className="text-xs text-text-muted">{lookupPreview.email}</p>
              {lookupPreview.currentClassName ? (
                <p className="text-xs text-brand-end">
                  Actuellement dans : {lookupPreview.currentClassName} — sera déplacé vers{' '}
                  {selectedClass?.name ?? 'cette classe'}.
                </p>
              ) : (
                <p className="text-xs text-text-muted">
                  Aucune classe assignée — sera ajouté à {selectedClass?.name ?? 'cette classe'}.
                </p>
              )}
              <button
                type="button"
                disabled={addingStudent || !selectedClass}
                onClick={() => void handleAddStudent()}
                className="jf-btn-primary w-full min-h-11 rounded-xl text-sm disabled:opacity-50"
              >
                {addingStudent ? 'Ajout…' : `Ajouter à ${selectedClass?.name ?? 'la classe'}`}
              </button>
            </div>
          )}
        </div>

        {/* Class selector */}
        {classes.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={[
                  'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                  selectedClass?.id === cls.id
                    ? 'jf-chip-active border-transparent text-white'
                    : 'border-border bg-bg-card text-text-muted',
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
                'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                groupFilter === value
                  ? 'jf-chip-active border-transparent text-white'
                  : 'border-border bg-bg-card text-text-muted',
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
                className="text-xs text-brand-end underline underline-offset-2"
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
                  onClick={() => {
                    const classId = selectedClass?.id;
                    const qs = classId ? `?classId=${classId}` : '';
                    navigate(`/teacher/eleve/${student.id}${qs}`);
                  }}
                  className="w-full rounded-2xl border border-border bg-bg-card p-4 text-left transition-colors hover:border-brand/45"
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
                        {student.blocked && student.blockedTrickName && (
                          <span className="text-brand-end"> · Bloqué</span>
                        )}
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

