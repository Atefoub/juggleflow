import BottomNav from '../../components/BottomNav';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  type AdminClassStudent,
  type AdminEstablishmentStats,
  type AdminSchoolClass,
  type AdminUser,
} from '../../api/adminApi';

const navItems = [
  { label: 'Utilisateurs', icon: '👥', path: '/admin/users' },
  { label: 'Classes',      icon: '🏫', path: '/admin/classes' },
  { label: 'RGPD',         icon: '🔒', path: '/admin/rgpd' },
  { label: 'Journal',      icon: '📋', path: '/admin/audit' },
];

const LEVELS = ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'] as const;

function cycleLabel(level: string): string {
  if (['PS', 'MS', 'GS'].includes(level)) return 'Cycle 1';
  if (['CP', 'CE1', 'CE2'].includes(level)) return 'Cycle 2';
  if (['CM1', 'CM2'].includes(level)) return 'Cycle 3';
  return '—';
}

function groupColorClass(c: AdminClassStudent['groupColor']): string {
  if (c === 'VERT') return 'text-success bg-success/10 border-success/30';
  if (c === 'ORANGE') return 'text-amber-700 bg-amber-500/15 border-amber-500/40';
  return 'text-alert bg-alert/10 border-alert/30';
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
      setFormError('Mise à jour impossible (contrainte d’unicité ou données invalides).');
    } finally {
      setBusy(false);
    }
  }

  async function submitDeleteClass() {
    if (manageClass == null) return;
    if (manageClass.studentCount > 0) {
      setFormError('Retire d’abord les élèves de la classe (côté enseignant ou support).');
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
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-1">Classes</h1>
        <p className="text-xs text-text-muted">Vue établissement — données issues de la base</p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Synthèse
          </h2>
          <div className="p-4 rounded-2xl bg-bg-card border border-border">
            <p className="text-sm text-text-secondary mb-2">
              Effectifs déclarés en base. Création et modification de classes : administrateur ; titulaire = compte
              enseignant.
            </p>
            {stats && (
              <p className="text-xs text-text-muted mb-3 leading-relaxed">
                Comptes actifs (tous rôles) : {stats.activeUserCount} · Enseignants : {stats.teacherAccountCount} ·
                Administrateurs : {stats.administratorAccountCount}
                {stats.licenseSeatCap != null
                  ? ` · Plafond licence : ${stats.licenseSeatCap}`
                  : ' · Plafond licence : non configuré côté serveur'}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-bg-primary border border-border text-center">
                <p className="font-display font-bold text-2xl text-text-primary">
                  {stats != null ? stats.classCount : classes.length}
                </p>
                <p className="text-[0.65rem] text-text-muted uppercase tracking-wide">Classes</p>
              </div>
              <div className="p-3 rounded-xl bg-bg-primary border border-border text-center">
                <p className="font-display font-bold text-2xl text-text-primary">
                  {stats != null ? stats.studentCount : totalStudents}
                </p>
                <p className="text-[0.65rem] text-text-muted uppercase tracking-wide">Élèves (total)</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Classes
            </h2>
            <button
              type="button"
              onClick={openCreate}
              disabled={isLoading}
              className="jf-btn-primary jf-btn-primary-sm"
            >
              + Classe
            </button>
          </div>

          {isLoading && (
            <p className="text-sm text-text-muted text-center py-8">Chargement…</p>
          )}

          {!isLoading && error && (
            <p className="text-sm text-alert text-center py-8">{error}</p>
          )}

          {!isLoading && !error && (
            <div className="flex flex-col gap-3">
              {sorted.map((cls) => (
                <div key={cls.id} className="p-4 rounded-2xl bg-bg-card border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-text-primary">{cls.name}</p>
                      <p className="text-xs text-text-muted">
                        {cls.studentCount} élèves · {cycleLabel(cls.schoolLevel)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openManage(cls)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-text-primary font-semibold min-h-8 hover:opacity-90"
                    >
                      Gérer
                    </button>
                  </div>

                  <div className="flex gap-3 mb-2">
                    <div className="flex-1 p-2 rounded-xl bg-bg-primary border border-border text-center">
                      <p className="font-display font-bold text-brand text-xl">{cls.studentCount}</p>
                      <p className="text-[0.6rem] text-text-muted">Élèves</p>
                    </div>
                    <div className="flex-1 p-2 rounded-xl bg-bg-primary border border-border text-center">
                      <p className="font-display font-bold text-text-primary text-xl truncate px-1">
                        {cls.homeroomTeacherName ?? '—'}
                      </p>
                      <p className="text-[0.6rem] text-text-muted">Enseignant</p>
                    </div>
                    <div className="flex-1 p-2 rounded-xl bg-bg-primary border border-border text-center">
                      <p className="font-display font-bold text-text-muted text-xl">{cls.schoolYear}</p>
                      <p className="text-[0.6rem] text-text-muted">Année</p>
                    </div>
                  </div>
                  <p className="text-[0.65rem] text-text-muted">
                    Progression moyenne : ouvre « Gérer » pour le détail par élève.
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav items={navItems} />

      {modal === 'create' && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && !busy && closeModal()}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-card border border-border p-5 shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-labelledby="create-class-title"
          >
            <h2 id="create-class-title" className="font-display font-bold text-text-primary text-lg mb-4">
              Nouvelle classe
            </h2>
            {formError && <p className="text-sm text-alert mb-3">{formError}</p>}
            <label className="block text-xs text-text-muted mb-1">Nom</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
            />
            <label className="block text-xs text-text-muted mb-1">Niveau</label>
            <select
              value={createLevel}
              onChange={(e) => setCreateLevel(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
            >
              {LEVELS.map((lv) => (
                <option key={lv} value={lv}>{lv}</option>
              ))}
            </select>
            <label className="block text-xs text-text-muted mb-1">Année scolaire</label>
            <input
              type="number"
              min={2020}
              max={2100}
              value={createYear}
              onChange={(e) => setCreateYear(Number(e.target.value))}
              className="w-full mb-3 px-3 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
            />
            <label className="block text-xs text-text-muted mb-1">Titulaire (enseignant)</label>
            <select
              value={createTeacherId === '' ? '' : String(createTeacherId)}
              onChange={(e) => setCreateTeacherId(e.target.value ? Number(e.target.value) : '')}
              className="w-full mb-4 px-3 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
            >
              {teachers.length === 0 && <option value="">Aucun enseignant actif</option>}
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.email})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={closeModal}
                className="jf-btn-secondary flex-1 min-h-10 py-2.5 rounded-xl text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy || teachers.length === 0}
                onClick={submitCreate}
                className="jf-btn-primary flex-1 min-h-10 py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {busy ? '…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'manage' && manageClass != null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && !busy && closeModal()}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-bg-card border border-border p-5 shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-labelledby="manage-class-title"
          >
            <h2 id="manage-class-title" className="font-display font-bold text-text-primary text-lg mb-1">
              {manageClass.name}
            </h2>
            <p className="text-xs text-text-muted mb-4">Modifier la classe ou consulter les élèves.</p>
            {formError && <p className="text-sm text-alert mb-3">{formError}</p>}

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Nom</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Niveau</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
                >
                  {LEVELS.map((lv) => (
                    <option key={lv} value={lv}>{lv}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Année scolaire</label>
                <input
                  type="number"
                  min={2020}
                  max={2100}
                  value={editYear}
                  onChange={(e) => setEditYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Titulaire</label>
                <select
                  value={editTeacherId === '' ? '' : String(editTeacherId)}
                  onChange={(e) => setEditTeacherId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs font-semibold text-text-secondary mb-2">
              Progression moyenne de la classe : {loadingStudents ? '…' : `${avgProgress} %`}
            </p>

            <div className="rounded-xl border border-border bg-bg-primary p-3 mb-4 max-h-48 overflow-y-auto">
              <p className="text-xs text-text-muted mb-2">Élèves</p>
              {loadingStudents && <p className="text-xs text-text-muted">Chargement…</p>}
              {!loadingStudents && students.length === 0 && (
                <p className="text-xs text-text-muted">Aucun élève dans cette classe.</p>
              )}
              {!loadingStudents && students.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm"
                >
                  <span className="text-text-primary truncate pr-2">
                    {st.firstName} {st.lastName}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${groupColorClass(st.groupColor)}`}>
                    {st.progressionPercent}%
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeModal}
                  className="jf-btn-secondary flex-1 min-h-10 py-2.5 rounded-xl text-sm"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitManage}
                  className="jf-btn-primary flex-1 min-h-10 py-2.5 rounded-xl text-sm disabled:opacity-50"
                >
                  {busy ? '…' : 'Enregistrer'}
                </button>
              </div>
              <button
                type="button"
                disabled={busy || manageClass.studentCount > 0}
                title={manageClass.studentCount > 0 ? 'Retire tous les élèves avant suppression' : undefined}
                onClick={submitDeleteClass}
                className="w-full py-2 rounded-xl text-sm font-semibold text-alert border border-alert/40 bg-alert/10 min-h-10 disabled:opacity-40"
              >
                Supprimer la classe (vide uniquement)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
