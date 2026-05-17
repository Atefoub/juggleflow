import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import {
  teacherApi,
  GROUP_COLOR_MAP,
  GROUP_LABEL_MAP,
  type SchoolClass,
  type StudentSummary,
} from '../../api/teacherApi';
import {
  GROUP_ORDER,
  averageGroupProgress,
  formatLastActivity,
  groupStudentsByColor,
  type GroupColor,
} from '../../utils/teacherGroups';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours/assigner' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

const GROUP_DISPLAY: Record<GroupColor, string> = {
  VERT:   'Vert',
  ORANGE: 'Orange',
  ROUGE:  'Rouge',
};

type GroupFilter = 'Tous' | GroupColor;

const GROUP_FILTERS: { value: GroupFilter; label: string }[] = [
  { value: 'Tous',   label: 'Tous' },
  { value: 'VERT',   label: 'Vert' },
  { value: 'ORANGE', label: 'Orange' },
  { value: 'ROUGE',  label: 'Rouge' },
];

function studentInitials(s: StudentSummary): string {
  return `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
}

export default function GroupManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const preselect = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const classIdRaw = params.get('classId');
    const groupRaw = params.get('group');
    const classId = classIdRaw ? Number(classIdRaw) : null;
    const group =
      groupRaw === 'VERT' || groupRaw === 'ORANGE' || groupRaw === 'ROUGE'
        ? groupRaw
        : null;
    return {
      classId: classId != null && Number.isFinite(classId) ? classId : null,
      group,
    };
  }, [location.search]);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('Tous');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [dragStudentId, setDragStudentId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<GroupColor | null>(null);

  const loadStudents = useCallback(async (classId: number) => {
    const data = await teacherApi.getClassStudents(classId);
    setStudents(data);
  }, []);

  useEffect(() => {
    teacherApi
      .getMyClasses()
      .then((cls) => {
        setClasses(cls);
        if (cls.length === 0) return;
        const found = preselect.classId
          ? cls.find((c) => c.id === preselect.classId) ?? cls[0]
          : cls[0];
        setSelectedClass(found);
      })
      .catch(() => setError('Impossible de charger vos classes.'))
      .finally(() => setLoading(false));
  }, [preselect.classId]);

  useEffect(() => {
    if (preselect.group) setGroupFilter(preselect.group);
  }, [preselect.group]);

  useEffect(() => {
    if (!selectedClass) return;
    setError(null);
    loadStudents(selectedClass.id).catch(() =>
      setError('Impossible de charger les élèves de cette classe.'),
    );
  }, [selectedClass, loadStudents]);

  const groups = useMemo(() => groupStudentsByColor(students), [students]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesGroup = groupFilter === 'Tous' || s.groupColor === groupFilter;
      const matchesSearch =
        q === '' || `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
      return matchesGroup && matchesSearch;
    });
  }, [students, groupFilter, search]);

  async function moveStudent(studentId: number, target: GroupColor) {
    if (!selectedClass) return;
    const current = students.find((s) => s.id === studentId);
    if (!current || current.groupColor === target) return;

    setSavingId(studentId);
    setError(null);
    try {
      const updated = await teacherApi.updateStudentGroup(
        selectedClass.id,
        studentId,
        target,
      );
      setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
    } catch {
      setError('Impossible de mettre à jour le groupe. Réessayez.');
    } finally {
      setSavingId(null);
    }
  }

  async function resetStudentToAuto(studentId: number) {
    if (!selectedClass) return;
    setSavingId(studentId);
    setError(null);
    try {
      const updated = await teacherApi.updateStudentGroup(
        selectedClass.id,
        studentId,
        null,
      );
      setStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
    } catch {
      setError('Impossible de réinitialiser le groupe automatique.');
    } finally {
      setSavingId(null);
    }
  }

  function handleDragStart(studentId: number) {
    setDragStudentId(studentId);
  }

  function handleDragEnd() {
    setDragStudentId(null);
    setDropTarget(null);
  }

  function handleDrop(target: GroupColor) {
    if (dragStudentId != null) {
      void moveStudent(dragStudentId, target);
    }
    handleDragEnd();
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <div className="flex items-start gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="shrink-0 mt-1 text-text-muted hover:text-text-primary text-lg"
            aria-label="Retour"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-text-primary text-2xl">
              Gestion des groupes
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {loading || !selectedClass
                ? '…'
                : `${selectedClass.name} · ${students.length} élève${students.length !== 1 ? 's' : ''} · 3 groupes`}
            </p>
          </div>
        </div>

        {classes.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {classes.map((cls) => (
              <button
                key={cls.id}
                type="button"
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

        <p className="text-xs text-text-muted leading-relaxed">
          Glissez des élèves entre les colonnes pour les répartir. Un badge « manuel »
          indique un groupe fixé par vous ; touchez × pour repasser au calcul automatique.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl animate-pulse bg-bg-card" />
            ))}
          </div>
        )}

        {!loading && selectedClass && students.length > 0 && (
          <>
            {/* Colonnes par groupe */}
            <section className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {GROUP_ORDER.map((color) => {
                const list = groups[color];
                const avg = averageGroupProgress(list);
                const isDrop = dropTarget === color;
                return (
                  <div
                    key={color}
                    className={[
                      'min-w-45 flex-1 flex flex-col rounded-2xl border bg-bg-card transition-colors',
                      isDrop ? 'border-brand ring-2 ring-brand/30' : 'border-border',
                    ].join(' ')}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTarget(color);
                    }}
                    onDragLeave={() => setDropTarget((t) => (t === color ? null : t))}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(color);
                    }}
                  >
                    <div
                      className="p-3 border-b border-border"
                      style={{ borderTopColor: GROUP_COLOR_MAP[color], borderTopWidth: 3 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: GROUP_COLOR_MAP[color] }}
                        />
                        <p className="text-sm font-bold text-text-primary">
                          Groupe {GROUP_DISPLAY[color]}
                        </p>
                      </div>
                      <p className="text-[0.65rem] text-text-muted mb-2">
                        {list.length} élève{list.length !== 1 ? 's' : ''} · {GROUP_LABEL_MAP[color]}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar
                            value={avg}
                            color={GROUP_COLOR_MAP[color]}
                            height="5px"
                          />
                        </div>
                        <span className="text-xs font-bold text-text-primary">{avg}%</span>
                      </div>
                    </div>

                    <div className="p-2 flex flex-col gap-2 min-h-24 max-h-56 overflow-y-auto">
                      {list.length === 0 && (
                        <p className="text-[0.65rem] text-text-muted text-center py-4 px-1">
                          Déposez un élève ici
                        </p>
                      )}
                      {list.map((s) => (
                        <div
                          key={s.id}
                          draggable={savingId !== s.id}
                          onDragStart={() => handleDragStart(s.id)}
                          onDragEnd={handleDragEnd}
                          className={[
                            'flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left cursor-grab active:cursor-grabbing',
                            dragStudentId === s.id
                              ? 'opacity-50 border-brand/50'
                              : 'border-border bg-[#121830]',
                            savingId === s.id ? 'pointer-events-none' : '',
                          ].join(' ')}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                            style={{ backgroundColor: GROUP_COLOR_MAP[color] }}
                          >
                            {studentInitials(s)}
                          </span>
                          <span className="flex-1 min-w-0 text-xs font-semibold text-text-primary truncate">
                            {s.firstName} {s.lastName[0]}.
                          </span>
                          {s.groupColorManual && (
                            <button
                              type="button"
                              title="Repasser au groupe automatique"
                              disabled={savingId === s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void resetStudentToAuto(s.id);
                              }}
                              className="shrink-0 text-text-muted hover:text-text-primary text-xs px-1"
                              aria-label={`Réinitialiser le groupe de ${s.firstName}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Recherche + filtres */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-card border border-border">
              <span role="img" aria-label="recherche" className="text-sm">🔍</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un élève…"
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {GROUP_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGroupFilter(value)}
                  className={[
                    'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                    groupFilter === value
                      ? 'jf-chip-active border-transparent text-white'
                      : 'border-border bg-bg-card text-text-muted',
                  ].join(' ')}
                >
                  {label}
                  {value !== 'Tous' && (
                    <span className="ml-1 opacity-80">
                      ({groups[value as GroupColor].length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Liste détaillée */}
            <section>
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
                Élèves
              </h2>
              <div className="rounded-2xl overflow-hidden border border-border">
                <div className="hidden sm:grid grid-cols-[1fr_80px_100px] gap-2 px-4 py-2 bg-[#121830] text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
                  <span>Élève</span>
                  <span className="text-right">Progression</span>
                  <span className="text-right">Dernière co.</span>
                </div>
                <ul>
                  {filteredList.map((s, i) => {
                    const chipColor = GROUP_COLOR_MAP[s.groupColor];
                    return (
                      <li
                        key={s.id}
                        draggable={savingId !== s.id}
                        onDragStart={() => handleDragStart(s.id)}
                        onDragEnd={handleDragEnd}
                        className={[
                          'px-4 py-3 bg-bg-card',
                          i < filteredList.length - 1 ? 'border-b border-border' : '',
                          dragStudentId === s.id ? 'opacity-50' : '',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/teacher/eleve/${s.id}?classId=${selectedClass.id}`,
                            )
                          }
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-3 sm:grid sm:grid-cols-[1fr_80px_100px] sm:items-center">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: chipColor }}
                              >
                                {studentInitials(s)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">
                                  {s.firstName} {s.lastName}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {GROUP_LABEL_MAP[s.groupColor]}
                                  {s.groupColorManual && (
                                    <span className="ml-1 text-brand-end">· manuel</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-text-primary sm:text-right">
                              {s.progressionPercent}%
                            </span>
                            <span className="text-xs text-text-muted sm:text-right">
                              {formatLastActivity(s.lastActivityAt)}
                            </span>
                          </div>
                        </button>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {GROUP_ORDER.map((g) => (
                            <button
                              key={g}
                              type="button"
                              disabled={savingId === s.id || s.groupColor === g}
                              onClick={() => void moveStudent(s.id, g)}
                              className={[
                                'rounded-lg px-2 py-0.5 text-[0.65rem] font-semibold border transition-colors',
                                s.groupColor === g
                                  ? 'border-transparent text-white'
                                  : 'border-border text-text-muted hover:border-brand/40',
                              ].join(' ')}
                              style={
                                s.groupColor === g
                                  ? { backgroundColor: GROUP_COLOR_MAP[g] }
                                  : undefined
                              }
                            >
                              {GROUP_DISPLAY[g]}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {filteredList.length === 0 && (
                  <p className="text-sm text-text-muted text-center py-8">
                    Aucun élève ne correspond à ces filtres.
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        {!loading && students.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-text-muted">
              Aucun élève dans cette classe. Ajoutez-en depuis la liste des élèves.
            </p>
            <button
              type="button"
              onClick={() => navigate('/teacher/eleves')}
              className="text-xs text-brand-end underline underline-offset-2"
            >
              Aller aux élèves →
            </button>
          </div>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
