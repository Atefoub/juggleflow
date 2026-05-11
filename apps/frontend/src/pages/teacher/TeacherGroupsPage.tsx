import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import BottomNav from '../../components/BottomNav';
import { TEACHER_NAV_ITEMS } from '../../components/teacher/teacherNav';
import {
  teacherApi,
  GROUP_PALETTE,
  type SchoolClass,
  type StudentSummary,
  type StudentGroup,
  type StudentGroupColor,
} from '../../api/teacherApi';

const COLOR_CHOICES: StudentGroupColor[] = [
  'BLEU', 'VERT', 'ORANGE', 'ROUGE', 'VIOLET', 'JAUNE', 'GRIS',
];

const UNASSIGNED_ZONE = 'unassigned';

/* ──────────────────────────────────────────────────────────────
 *  Petit composant draggable pour un éleve
 *  ────────────────────────────────────────────────────────────── */
function DraggableStudent({
  student,
  fromGroupId,
  compact,
}: {
  student: StudentSummary;
  fromGroupId: number | null;
  compact?: boolean;
}) {
  const dragId = `student-${student.id}-from-${fromGroupId ?? 'unassigned'}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { studentId: student.id, fromGroupId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Eleve ${student.firstName} ${student.lastName} (deplacer vers un groupe)`}
      className={[
        'flex items-center gap-2 rounded-xl border border-border bg-bg-input',
        'px-3 py-2 text-sm text-text-primary cursor-grab active:cursor-grabbing',
        'select-none',
        isDragging ? 'opacity-30' : '',
        compact ? 'min-w-0' : '',
      ].join(' ')}
    >
      <span
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: '#5B20E6' }}
      >
        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
      </span>
      <span className="truncate">{student.firstName} {student.lastName}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 *  Drop-zone d'un groupe
 *  ────────────────────────────────────────────────────────────── */
function GroupDropZone({
  group,
  members,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  group: StudentGroup;
  members: StudentSummary[];
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: { groupId: group.id },
  });

  const palette = GROUP_PALETTE[group.color];

  return (
    <section
      ref={setNodeRef}
      className={[
        'rounded-2xl border bg-bg-card p-3 flex flex-col gap-2 transition-colors',
        isOver ? 'border-brand bg-brand/8' : 'border-border',
      ].join(' ')}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            className="shrink-0 w-3 h-3 rounded-full"
            style={{ backgroundColor: palette.hex }}
          />
          <h3 className="font-display font-bold text-text-primary text-sm truncate">{group.name}</h3>
          <span className="text-[0.65rem] text-text-muted shrink-0">
            ({group.memberCount} eleve{group.memberCount > 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            aria-label="Monter le groupe"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="px-2 py-1 rounded-md text-xs text-text-muted hover:text-text-primary disabled:opacity-30"
          >▲</button>
          <button
            aria-label="Descendre le groupe"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="px-2 py-1 rounded-md text-xs text-text-muted hover:text-text-primary disabled:opacity-30"
          >▼</button>
          <button
            aria-label="Modifier le groupe"
            onClick={onEdit}
            className="px-2 py-1 rounded-md text-xs text-text-muted hover:text-text-primary"
          >✏️</button>
          <button
            aria-label="Supprimer le groupe"
            onClick={onDelete}
            className="px-2 py-1 rounded-md text-xs text-alert hover:opacity-80"
          >🗑</button>
        </div>
      </header>

      <div className="min-h-[3rem] flex flex-col gap-1.5 rounded-xl border border-dashed border-border/60 p-2">
        {members.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-2">
            Glissez des eleves ici
          </p>
        ) : (
          members.map((m) => (
            <DraggableStudent key={m.id} student={m} fromGroupId={group.id} compact />
          ))
        )}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
 *  Drop-zone "non groupes"
 *  ────────────────────────────────────────────────────────────── */
function UnassignedZone({ members }: { members: StudentSummary[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: UNASSIGNED_ZONE,
    data: { groupId: null },
  });

  return (
    <section
      ref={setNodeRef}
      className={[
        'rounded-2xl border bg-bg-card p-3 flex flex-col gap-2 transition-colors',
        isOver ? 'border-brand bg-brand/8' : 'border-border',
      ].join(' ')}
    >
      <header className="flex items-center justify-between">
        <h3 className="font-display font-bold text-text-primary text-sm">
          Sans groupe
        </h3>
        <span className="text-[0.65rem] text-text-muted">
          {members.length} eleve{members.length > 1 ? 's' : ''}
        </span>
      </header>
      <div className="min-h-[3rem] flex flex-col gap-1.5 rounded-xl border border-dashed border-border/60 p-2">
        {members.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-2">
            Tous les eleves sont dans un groupe.
          </p>
        ) : (
          members.map((m) => (
            <DraggableStudent key={m.id} student={m} fromGroupId={null} compact />
          ))
        )}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
 *  Modale création / édition de groupe
 *  ────────────────────────────────────────────────────────────── */
function GroupModal({
  initial,
  onClose,
  onSave,
}: {
  initial: { name: string; color: StudentGroupColor } | null;
  onClose: () => void;
  onSave: (data: { name: string; color: StudentGroupColor }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState<StudentGroupColor>(initial?.color ?? 'BLEU');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Le nom du groupe est obligatoire.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({ name: trimmed, color });
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) setError('Un autre groupe porte deja ce nom dans la classe.');
      else setError("Impossible d'enregistrer le groupe.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-100 rounded-2xl bg-bg-card border border-border p-4 flex flex-col gap-3">
        <h2 className="font-display font-bold text-text-primary text-lg">
          {isEdit ? 'Modifier le groupe' : 'Nouveau groupe'}
        </h2>
        {error && (
          <div className="p-2 rounded-xl text-xs text-alert bg-alert/10 border border-alert/30">
            {error}
          </div>
        )}
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Nom du groupe
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="w-full px-3 py-2 rounded-xl bg-bg-input border border-border text-sm text-text-primary outline-none"
            placeholder="Ex. Equipe Lundi"
            autoFocus
          />
        </label>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-text-muted">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Couleur ${GROUP_PALETTE[c].label}`}
                aria-pressed={color === c}
                className={[
                  'w-9 h-9 rounded-full border-2 transition-transform',
                  color === c ? 'border-text-primary scale-110' : 'border-transparent',
                ].join(' ')}
                style={{ backgroundColor: GROUP_PALETTE[c].hex }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="jf-btn-secondary flex-1 py-2 rounded-xl text-sm"
          >Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="jf-btn-primary flex-1 py-2 rounded-xl text-sm disabled:opacity-50"
          >{submitting ? '…' : isEdit ? 'Enregistrer' : 'Creer'}</button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 *  Page principale
 *  ────────────────────────────────────────────────────────────── */
export default function TeacherGroupsPage() {
  const navigate = useNavigate();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);

  useEffect(() => {
    teacherApi
      .getMyClasses()
      .then((cls) => {
        setClasses(cls);
        setSelectedClass(cls[0] ?? null);
      })
      .catch(() => setError('Impossible de charger vos classes.'))
      .finally(() => setLoading(false));
  }, []);

  const reloadGroups = useCallback(async () => {
    if (!selectedClass) return;
    const data = await teacherApi.listGroups(selectedClass.id);
    setGroups(data);
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    let cancelled = false;
    setError(null);
    Promise.all([
      teacherApi.getClassStudents(selectedClass.id),
      teacherApi.listGroups(selectedClass.id),
    ])
      .then(([s, g]) => {
        if (cancelled) return;
        setStudents(s);
        setGroups(g);
      })
      .catch(() => !cancelled && setError('Impossible de charger les groupes.'));
    return () => { cancelled = true; };
  }, [selectedClass]);

  // Index : pour chaque eleve, quel groupe le contient (ou null)
  const studentToGroup = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const s of students) map.set(s.id, null);
    for (const g of groups) {
      for (const id of g.memberIds) map.set(id, g.id);
    }
    return map;
  }, [students, groups]);

  const unassignedStudents = useMemo(
    () => students.filter((s) => studentToGroup.get(s.id) === null),
    [students, studentToGroup],
  );

  const groupedStudents = useMemo(() => {
    const out: Record<number, StudentSummary[]> = {};
    for (const g of groups) {
      out[g.id] = g.memberIds
        .map((id) => students.find((s) => s.id === id))
        .filter((s): s is StudentSummary => !!s);
    }
    return out;
  }, [groups, students]);

  const activeStudent = useMemo(() => {
    if (!activeDragId) return null;
    const match = activeDragId.match(/^student-(\d+)-/);
    if (!match) return null;
    return students.find((s) => s.id === Number(match[1])) ?? null;
  }, [activeDragId, students]);

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || !selectedClass) return;

    const studentId = active.data.current?.studentId as number | undefined;
    const fromGroupId = active.data.current?.fromGroupId as number | null | undefined;
    const targetGroupId = over.data.current?.groupId as number | null | undefined;
    if (studentId == null) return;
    if (fromGroupId === targetGroupId) return;

    // 1) Retirer de l'ancien groupe si applicable
    try {
      if (fromGroupId != null) {
        const oldGroup = groups.find((g) => g.id === fromGroupId);
        if (oldGroup) {
          const nextMembers = oldGroup.memberIds.filter((id) => id !== studentId);
          await teacherApi.setGroupMembers(selectedClass.id, oldGroup.id, nextMembers);
        }
      }
      // 2) Ajouter au nouveau groupe si pas "non groupe"
      if (targetGroupId != null) {
        const newGroup = groups.find((g) => g.id === targetGroupId);
        if (newGroup && !newGroup.memberIds.includes(studentId)) {
          const nextMembers = [...newGroup.memberIds, studentId];
          await teacherApi.setGroupMembers(selectedClass.id, newGroup.id, nextMembers);
        }
      }
      await reloadGroups();
    } catch {
      setError("Impossible de mettre a jour le groupe. Reessayez.");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  async function handleCreate(data: { name: string; color: StudentGroupColor }) {
    if (!selectedClass) return;
    await teacherApi.createGroup(selectedClass.id, data);
    await reloadGroups();
  }

  async function handleEdit(data: { name: string; color: StudentGroupColor }) {
    if (!selectedClass || !editingGroup) return;
    await teacherApi.updateGroup(selectedClass.id, editingGroup.id, data);
    await reloadGroups();
  }

  async function handleDelete(groupId: number) {
    if (!selectedClass) return;
    if (!window.confirm('Supprimer ce groupe ? Les eleves seront detaches.')) return;
    try {
      await teacherApi.deleteGroup(selectedClass.id, groupId);
      await reloadGroups();
    } catch {
      setError('Impossible de supprimer le groupe.');
    }
  }

  async function handleReorder(groupId: number, direction: -1 | 1) {
    if (!selectedClass) return;
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= groups.length) return;
    const reordered = [...groups];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(nextIdx, 0, moved);
    try {
      const updated = await teacherApi.reorderGroups(
        selectedClass.id,
        reordered.map((g) => g.id),
      );
      setGroups(updated);
    } catch {
      setError('Impossible de reordonner les groupes.');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-text-muted mb-3 hover:text-text-secondary"
        >← Retour</button>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="font-display font-bold text-text-primary text-2xl">Groupes</h1>
            <p className="text-xs text-text-secondary mt-1">
              Organisez vos eleves en groupes pedagogiques.
            </p>
          </div>
          <button
            onClick={() => { setEditingGroup(null); setModalOpen(true); }}
            disabled={!selectedClass}
            className="jf-btn-primary text-xs px-3 py-2 rounded-xl shrink-0 disabled:opacity-50"
          >+ Nouveau groupe</button>
        </div>

        {loading ? (
          <div className="h-10 rounded-xl animate-pulse bg-bg-input" />
        ) : classes.length === 0 ? (
          <p className="text-sm text-text-muted">Aucune classe trouvée.</p>
        ) : (
          <select
            className="w-full px-3 py-2.5 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
            value={selectedClass?.id ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedClass(classes.find((c) => c.id === id) ?? null);
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.schoolYear})</option>
            ))}
          </select>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl text-xs text-alert bg-alert/10 border border-alert/30">
            {error}
          </div>
        )}

        {selectedClass && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <UnassignedZone members={unassignedStudents} />

            {groups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-bg-card p-6 text-center">
                <p className="text-sm text-text-muted mb-2">Aucun groupe pour cette classe.</p>
                <button
                  onClick={() => { setEditingGroup(null); setModalOpen(true); }}
                  className="jf-btn-primary text-xs px-3 py-2 rounded-xl"
                >+ Creer le premier groupe</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {groups.map((g, idx) => (
                  <GroupDropZone
                    key={g.id}
                    group={g}
                    members={groupedStudents[g.id] ?? []}
                    onEdit={() => { setEditingGroup(g); setModalOpen(true); }}
                    onDelete={() => handleDelete(g.id)}
                    onMoveUp={() => handleReorder(g.id, -1)}
                    onMoveDown={() => handleReorder(g.id, 1)}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < groups.length - 1}
                  />
                ))}
              </div>
            )}

            <DragOverlay>
              {activeStudent && (
                <div className="flex items-center gap-2 rounded-xl border border-brand bg-bg-input px-3 py-2 text-sm text-text-primary shadow-2xl">
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: '#5B20E6' }}
                  >
                    {activeStudent.firstName.charAt(0)}{activeStudent.lastName.charAt(0)}
                  </span>
                  <span>{activeStudent.firstName} {activeStudent.lastName}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {modalOpen && (
        <GroupModal
          initial={editingGroup ? { name: editingGroup.name, color: editingGroup.color } : null}
          onClose={() => { setModalOpen(false); setEditingGroup(null); }}
          onSave={editingGroup ? handleEdit : handleCreate}
        />
      )}

      <BottomNav items={TEACHER_NAV_ITEMS} />
    </div>
  );
}
