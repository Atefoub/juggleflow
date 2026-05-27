import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  type AdminClassStudent,
  type AdminEstablishmentStats,
  type AdminSchoolClass,
  type AdminUser,
} from '../../api/adminApi';
import AdminLicenseSection from '../../components/admin/AdminLicenseSection';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const LEVELS = ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'] as const;

function cycleLabel(level: string): string {
  if (['PS', 'MS', 'GS'].includes(level)) return 'Cycle 1';
  if (['CP', 'CE1', 'CE2'].includes(level)) return 'Cycle 2';
  if (['CM1', 'CM2'].includes(level)) return 'Cycle 3';
  return '—';
}

function groupChipClass(c: AdminClassStudent['groupColor']): string {
  if (c === 'VERT')   return 'jf-admin-chip jf-admin-chip-success';
  if (c === 'ORANGE') return 'jf-admin-chip jf-admin-chip-warning';
  return 'jf-admin-chip jf-admin-chip-danger';
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<AdminSchoolClass[]>([]);
  const [stats, setStats] = useState<AdminEstablishmentStats | null>(null);
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'none' | 'create' | 'manage'>('none');
  const [manageClass, setManageClass] = useState<AdminSchoolClass | null>(null);
  const [students, setStudents] = useState<AdminClassStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createLevel, setCreateLevel] = useState<string>('CP');
  const [createYear, setCreateYear] = useState<number>(new Date().getFullYear());
  const [createTeacherId, setCreateTeacherId] = useState<number | ''>('');

  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editYear, setEditYear] = useState<number>(new Date().getFullYear());
  const [editTeacherId, setEditTeacherId] = useState<number | ''>('');

  const defaultSchoolYear = useMemo(() => {
    if (classes.length === 0) return new Date().getFullYear();
    return Math.max(...classes.map((c) => c.schoolYear));
  }, [classes]);

  const reloadAll = useCallback(async () => {
    const [cls, users, st] = await Promise.all([
      adminApi.getClasses(),
      adminApi.getUsers(),
      adminApi.getEstablishmentStats().catch(() => null),
    ]);
    setClasses(cls);
    setStats(st);
    setTeachers(users.filter((u) => u.role === 'ROLE_ENSEIGNANT'));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await reloadAll();
      } catch {
        if (!cancelled) setError('Impossible de charger les classes.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [reloadAll]);

  useEffect(() => {
    if (modal !== 'create') return;
    setCreateYear(defaultSchoolYear);
  }, [modal, defaultSchoolYear]);

  useEffect(() => {
    if (modal !== 'manage' || manageClass == null) return;
    let cancelled = false;

    const loadStudents = async () => {
      try {
        setLoadingStudents(true);
        const list = await adminApi.getClassStudents(manageClass.id);
        if (!cancelled) setStudents(list);
      } catch {
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    };

    loadStudents();
    return () => { cancelled = true; };
  }, [modal, manageClass]);

  const sorted = useMemo(() => {
    return [...classes].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [classes]);

  const totalStudents = useMemo(
    () => classes.reduce((s, c) => s + (c.studentCount ?? 0), 0),
    [classes],
  );

  const avgProgress = useMemo(() => {
    if (students.length === 0) return 0;
    return Math.round(
      students.reduce((s, st) => s + st.progressionPercent, 0) / students.length,
    );
  }, [students]);

  function openCreate() {
    setFormError(null);
    setCreateName('');
    setCreateLevel('CP');
    setCreateYear(defaultSchoolYear);
    setCreateTeacherId(teachers[0]?.id ?? '');
    setModal('create');
  }

  function openManage(cls: AdminSchoolClass) {
    setFormError(null);
    setManageClass(cls);
    setEditName(cls.name);
    setEditLevel(cls.schoolLevel);
    setEditYear(cls.schoolYear);
    setEditTeacherId(cls.homeroomTeacherId ?? teachers[0]?.id ?? '');
    setModal('manage');
  }

  function closeModal() {
    setModal('none');
    setManageClass(null);
    setStudents([]);
    setFormError(null);
  }

  async function submitCreate() {
    setFormError(null);
    if (!createName.trim()) {
      setFormError('Indique un nom de classe.');
      return;
    }
    if (createTeacherId === '') {
      setFormError('Choisis un enseignant titulaire (compte actif).');
      return;
    }
    setBusy(true);
    try {
      await adminApi.createClass({
        name: createName.trim(),
        schoolLevel: createLevel,
        schoolYear: createYear,
        homeroomTeacherId: Number(createTeacherId),
      });
      await reloadAll();
      closeModal();
    } catch {
      setFormError('Création impossible (nom + année déjà utilisés, ou enseignant invalide).');
    } finally {
      setBusy(false);
    }
  }

  async function submitManage() {
    if (manageClass == null) return;
    setFormError(null);
    if (!editName.trim()) {
      setFormError('Indique un nom de classe.');
      return;
    }
    if (editTeacherId === '') {
      setFormError('Choisis un titulaire.');
      return;
    }
    setBusy(true);
    try {
      await adminApi.updateClass(manageClass.id, {
        name: editName.trim(),
        schoolLevel: editLevel,
        schoolYear: editYear,
        homeroomTeacherId: Number(editTeacherId),
      });
      await reloadAll();
      closeModal();
    } catch {
      setFormError('Mise à jour impossible (contrainte d\u2019unicité ou données invalides).');
    } finally {
      setBusy(false);
    }
  }

  async function submitDeleteClass() {
    if (manageClass == null) return;
    if (manageClass.studentCount > 0) {
      setFormError('Retire d\u2019abord les élèves de la classe (côté enseignant ou support).');
      return;
    }
    if (!window.confirm(`Supprimer la classe « ${manageClass.name} » ? Cette action est définitive.`)) return;
    setBusy(true);
    setFormError(null);
    try {
      await adminApi.deleteClass(manageClass.id);
      await reloadAll();
      closeModal();
    } catch {
      setFormError('Suppression impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Classes"
        description="Vue établissement — données issues de la base. Création et modification de classes : administrateur ; titulaire = compte enseignant."
        actions={
          <button
            type="button"
            onClick={openCreate}
            disabled={isLoading}
            className="jf-admin-btn-primary"
          >
            + Nouvelle classe
          </button>
        }
      />

      {/* Synthèse */}
      <section className="mb-6">
        <h2 className="jf-admin-section-title mb-3">Synthèse</h2>
        <div className="jf-admin-card p-5">
          {stats && (
            <p className="text-xs text-[var(--color-admin-text-muted)] mb-4 leading-relaxed">
              Comptes actifs (tous rôles) : <strong className="text-[var(--color-admin-text-secondary)]">{stats.activeUserCount}</strong> ·{' '}
              Enseignants : <strong className="text-[var(--color-admin-text-secondary)]">{stats.teacherAccountCount}</strong> ·{' '}
              Administrateurs : <strong className="text-[var(--color-admin-text-secondary)]">{stats.administratorAccountCount}</strong>
            </p>
          )}
          <AdminLicenseSection onUpdated={() => void reloadAll()} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-4">
            <div className="p-3 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-center">
              <p className="font-display font-bold text-2xl text-[var(--color-admin-text)]">
                {stats != null ? stats.classCount : classes.length}
              </p>
              <p className="text-[0.65rem] text-[var(--color-admin-text-muted)] uppercase tracking-wide mt-1">
                Classes
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-center">
              <p className="font-display font-bold text-2xl text-[var(--color-admin-text)]">
                {stats != null ? stats.studentCount : totalStudents}
              </p>
              <p className="text-[0.65rem] text-[var(--color-admin-text-muted)] uppercase tracking-wide mt-1">
                Élèves (total)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Liste des classes */}
      <section>
        <h2 className="jf-admin-section-title mb-3">Classes ({sorted.length})</h2>

        {isLoading && (
          <p className="text-sm text-[var(--color-admin-text-muted)] text-center py-8">Chargement…</p>
        )}

        {!isLoading && error && (
          <p className="text-sm text-[var(--color-admin-danger)] text-center py-8">{error}</p>
        )}

        {!isLoading && !error && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((cls) => (
              <div key={cls.id} className="jf-admin-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-admin-text)] truncate">{cls.name}</p>
                    <p className="text-xs text-[var(--color-admin-text-muted)] mt-0.5">
                      {cls.studentCount} élèves · {cycleLabel(cls.schoolLevel)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openManage(cls)}
                    className="jf-admin-btn-ghost shrink-0"
                  >
                    Gérer
                  </button>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-md bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
                    <dd className="font-display font-bold text-[var(--color-admin)] text-lg">{cls.studentCount}</dd>
                    <dt className="text-[0.6rem] text-[var(--color-admin-text-muted)] uppercase tracking-wider">Élèves</dt>
                  </div>
                  <div className="p-2 rounded-md bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] min-w-0">
                    <dd className="font-display font-bold text-[var(--color-admin-text)] text-sm truncate" title={cls.homeroomTeacherName ?? '—'}>
                      {cls.homeroomTeacherName ?? '—'}
                    </dd>
                    <dt className="text-[0.6rem] text-[var(--color-admin-text-muted)] uppercase tracking-wider">Enseignant</dt>
                  </div>
                  <div className="p-2 rounded-md bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
                    <dd className="font-display font-bold text-[var(--color-admin-text-muted)] text-lg">{cls.schoolYear}</dd>
                    <dt className="text-[0.6rem] text-[var(--color-admin-text-muted)] uppercase tracking-wider">Année</dt>
                  </div>
                </dl>

                <p className="text-[0.65rem] text-[var(--color-admin-text-muted)]">
                  Ouvre « Gérer » pour le détail élèves et la progression.
                </p>
              </div>
            ))}

            {sorted.length === 0 && (
              <p className="col-span-full text-sm text-[var(--color-admin-text-muted)] text-center py-8">
                Aucune classe enregistrée.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Modal Create ── */}
      {modal === 'create' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && !busy && closeModal()}
        >
          <div className="min-h-full grid place-items-center p-4">
            <div
              className="jf-admin-card w-full max-w-[28rem] p-5 shadow-xl"
              role="dialog"
              aria-labelledby="create-class-title"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
            <h2 id="create-class-title" className="font-display font-bold text-[var(--color-admin-text)] text-lg mb-4">
              Nouvelle classe
            </h2>
            {formError && (
              <p className="text-sm text-[var(--color-admin-danger)] mb-3">{formError}</p>
            )}
            <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cc-name">Nom</label>
            <input
              id="cc-name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="jf-admin-input mb-3"
            />
            <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cc-level">Niveau</label>
            <select
              id="cc-level"
              value={createLevel}
              onChange={(e) => setCreateLevel(e.target.value)}
              className="jf-admin-input mb-3"
            >
              {LEVELS.map((lv) => (
                <option key={lv} value={lv}>{lv}</option>
              ))}
            </select>
            <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cc-year">Année scolaire</label>
            <input
              id="cc-year"
              type="number"
              min={2020}
              max={2100}
              value={createYear}
              onChange={(e) => setCreateYear(Number(e.target.value))}
              className="jf-admin-input mb-3"
            />
            <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cc-teacher">Titulaire (enseignant)</label>
            <select
              id="cc-teacher"
              value={createTeacherId === '' ? '' : String(createTeacherId)}
              onChange={(e) => setCreateTeacherId(e.target.value ? Number(e.target.value) : '')}
              className="jf-admin-input mb-4"
            >
              {teachers.length === 0 && <option value="">Aucun enseignant actif</option>}
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.email})
                </option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button type="button" disabled={busy} onClick={closeModal} className="jf-admin-btn-secondary">
                Annuler
              </button>
              <button
                type="button"
                disabled={busy || teachers.length === 0}
                onClick={submitCreate}
                className="jf-admin-btn-primary"
              >
                {busy ? '…' : 'Créer'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Manage ── */}
      {modal === 'manage' && manageClass != null && (
        <div
          className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && !busy && closeModal()}
        >
          <div className="min-h-full grid place-items-center p-4">
            <div
              className="jf-admin-card w-full max-w-[32rem] p-5 shadow-xl"
              role="dialog"
              aria-labelledby="manage-class-title"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
            <h2 id="manage-class-title" className="font-display font-bold text-[var(--color-admin-text)] text-lg mb-1">
              {manageClass.name}
            </h2>
            <p className="text-xs text-[var(--color-admin-text-muted)] mb-4">
              Modifier la classe ou consulter les élèves.
            </p>
            {formError && (
              <p className="text-sm text-[var(--color-admin-danger)] mb-3">{formError}</p>
            )}

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="mc-name">Nom</label>
                <input
                  id="mc-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="jf-admin-input"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="mc-level">Niveau</label>
                <select
                  id="mc-level"
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="jf-admin-input"
                >
                  {LEVELS.map((lv) => (
                    <option key={lv} value={lv}>{lv}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="mc-year">Année scolaire</label>
                <input
                  id="mc-year"
                  type="number"
                  min={2020}
                  max={2100}
                  value={editYear}
                  onChange={(e) => setEditYear(Number(e.target.value))}
                  className="jf-admin-input"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="mc-teacher">Titulaire</label>
                <select
                  id="mc-teacher"
                  value={editTeacherId === '' ? '' : String(editTeacherId)}
                  onChange={(e) => setEditTeacherId(e.target.value ? Number(e.target.value) : '')}
                  className="jf-admin-input"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs font-semibold text-[var(--color-admin-text-secondary)] mb-2">
              Progression moyenne : {loadingStudents ? '…' : `${avgProgress} %`}
            </p>

            <div className="rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg)] p-3 mb-4 max-h-48 overflow-y-auto">
              <p className="jf-admin-section-title mb-2">Élèves</p>
              {loadingStudents && <p className="text-xs text-[var(--color-admin-text-muted)]">Chargement…</p>}
              {!loadingStudents && students.length === 0 && (
                <p className="text-xs text-[var(--color-admin-text-muted)]">Aucun élève dans cette classe.</p>
              )}
              {!loadingStudents && students.map((st, i) => (
                <div
                  key={st.id}
                  className={`flex items-center justify-between py-2 text-sm ${i < students.length - 1 ? 'border-b border-[var(--color-admin-border)]' : ''}`}
                >
                  <span className="text-[var(--color-admin-text)] truncate pr-2">
                    {st.firstName} {st.lastName}
                  </span>
                  <span className={`${groupChipClass(st.groupColor)} shrink-0`}>
                    {st.progressionPercent}%
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 justify-end">
                <button type="button" disabled={busy} onClick={closeModal} className="jf-admin-btn-secondary">
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitManage}
                  className="jf-admin-btn-primary"
                >
                  {busy ? '…' : 'Enregistrer'}
                </button>
              </div>
              <button
                type="button"
                disabled={busy || manageClass.studentCount > 0}
                title={manageClass.studentCount > 0 ? 'Retire tous les élèves avant suppression' : undefined}
                onClick={submitDeleteClass}
                className="jf-admin-btn-danger w-full"
              >
                Supprimer la classe (vide uniquement)
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
