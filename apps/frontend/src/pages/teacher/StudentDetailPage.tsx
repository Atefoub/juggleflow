import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppIcon from '../../components/icons/AppIcon';
import type { IconName } from '../../components/icons/iconRegistry';
import ProgressBar from '../../components/ProgressBar';
import {
  GROUP_COLOR_MAP,
  GROUP_LABEL_MAP,
} from '../../api/teacherApi';
import { pathsApi } from '../../api/teacher/pathsApi';
import { classesApi } from '../../api/teacher/classesApi';
import { teacherQueryKeys } from '../../api/teacher/queryKeys';
import { catalogueApi } from '../../api/catalogueApi';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import ProgressStatusIcon from '../../components/icons/ProgressStatusIcon';
import { useTeacherPathCatalogQuery } from '../../hooks/teacher/useTeacherPathCatalogQuery';
import {
  useStudentDetailQuery,
} from '../../hooks/teacher/useStudentDetailQuery';
import { useStudentPathProgressQuery } from '../../hooks/teacher/useStudentPathProgressQuery';
import { useInvalidateTeacherClass } from '../../hooks/teacher/useTeacherClassDataQuery';

const STATUS_CONFIG = {
  MASTERED:    { label: 'Maîtrisé',   textClass: 'text-success',    bgClass: 'bg-success/10  border border-success/30'  },
  IN_PROGRESS: { label: 'En cours',   textClass: 'text-brand-end',  bgClass: 'bg-brand/10    border border-brand/30'      },
  NOT_STARTED: { label: 'Non commencé', textClass: 'text-text-muted', bgClass: 'bg-border/50   border border-border'        },
} as const;

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = id ? Number(id) : null;
  const navigate = useNavigate();
  const location = useLocation();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const classIdFromQuery = useMemo(() => {
    const raw = query.get('classId');
    return raw ? Number(raw) : null;
  }, [query]);
  const pathIdFromQuery = useMemo(() => {
    const raw = query.get('pathId');
    return raw ? Number(raw) : null;
  }, [query]);

  const {
    student,
    classId: effectiveClassId,
    assignedPaths,
    effectiveAssignment,
    loading,
    error: loadError,
    refetch: refetchDetail,
  } = useStudentDetailQuery(studentId, classIdFromQuery);

  const { paths } = useTeacherPathCatalogQuery();

  const defaultPathId = useMemo(() => {
    const assignedIds = new Set(assignedPaths.map((p) => p.id));
    if (
      pathIdFromQuery != null &&
      Number.isFinite(pathIdFromQuery) &&
      assignedIds.has(pathIdFromQuery)
    ) {
      return pathIdFromQuery;
    }
    return effectiveAssignment?.learningPathId ?? assignedPaths[0]?.id ?? null;
  }, [pathIdFromQuery, assignedPaths, effectiveAssignment]);

  const [selectedPathId, setSelectedPathId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPathId(defaultPathId);
  }, [defaultPathId, studentId, effectiveClassId]);

  const pathProgressQuery = useStudentPathProgressQuery(
    effectiveClassId,
    selectedPathId,
    studentId,
  );
  const pathProgress = pathProgressQuery.data ?? null;

  const queryClient = useQueryClient();
  const invalidateClass = useInvalidateTeacherClass();

  const groupColor  = student?.groupColor ?? 'VERT';
  const chipColor   = GROUP_COLOR_MAP[groupColor];
  const progressPct = student?.progressionPercent ?? 0;
  const error = actionError ?? loadError;

  const primaryPathId =
    effectiveAssignment?.learningPathId ?? assignedPaths[0]?.id ?? null;

  const blockage = useMemo(() => {
    const fromPath = pathProgress?.trickDetails.find((t) => t.blocked);
    if (fromPath) {
      return {
        trickId: fromPath.trickId,
        trickName: fromPath.trickName,
        attemptCount: fromPath.attemptCount,
      };
    }
    const onPrimaryPath =
      selectedPathId == null
      || primaryPathId == null
      || selectedPathId === primaryPathId;
    if (onPrimaryPath && student?.blocked && student.blockedTrickName) {
      return {
        trickId: student.blockedTrickId,
        trickName: student.blockedTrickName,
        attemptCount: student.blockedAttemptCount ?? 0,
      };
    }
    return null;
  }, [student, pathProgress, selectedPathId, primaryPathId]);

  const blockagePrereqQuery = useQuery({
    queryKey: ['catalogue', 'trick', blockage?.trickId],
    queryFn: () => catalogueApi.getTrickById(blockage!.trickId!),
    enabled: blockage?.trickId != null,
    staleTime: 300_000,
  });
  const blockagePrerequisites = blockagePrereqQuery.data?.prerequisiteNames ?? [];

  const selectedPath = selectedPathId
    ? assignedPaths.find((p) => p.id === selectedPathId) ?? null
    : null;

  const removeMutation = useMutation({
    mutationFn: () =>
      classesApi.removeStudentFromClass(effectiveClassId!, student!.id),
    onSuccess: () => {
      if (effectiveClassId != null) {
        invalidateClass(effectiveClassId);
      }
      const qs = `?classId=${effectiveClassId}`;
      navigate(`/teacher/eleves${qs}`);
    },
    onError: (err) => {
      setActionError(apiErrorMessage(err, 'Impossible de retirer cet élève de la classe.'));
    },
  });

  const unassignMutation = useMutation({
    mutationFn: () =>
      pathsApi.unassignPathFromStudent(
        effectiveClassId!,
        studentId!,
        effectiveAssignment!.learningPathId,
      ),
    onSuccess: async () => {
      const unassignedPathId = effectiveAssignment!.learningPathId;
      const { data } = await refetchDetail();
      if (effectiveClassId != null) {
        invalidateClass(effectiveClassId);
        void queryClient.invalidateQueries({
          queryKey: teacherQueryKeys.studentDetail(studentId ?? 0, classIdFromQuery),
        });
        if (studentId != null) {
          void queryClient.invalidateQueries({
            queryKey: teacherQueryKeys.studentPathProgress(
              effectiveClassId,
              unassignedPathId,
              studentId,
            ),
          });
        }
      }
      const nextPathId =
        data?.effectiveAssignment?.learningPathId
        ?? data?.assignedPaths[0]?.id
        ?? null;
      setSelectedPathId(nextPathId);
    },
    onError: (err) => {
      setActionError(apiErrorMessage(err, 'Impossible de retirer le parcours.'));
    },
  });

  function handleRemoveFromClass() {
    if (!student || effectiveClassId == null || removeMutation.isPending) return;
    const confirmed = window.confirm(
      `Retirer ${student.firstName} ${student.lastName} de cette classe ?\n\n`
        + 'La progression de l\'élève est conservée ; il pourra être réinscrit plus tard.',
    );
    if (!confirmed) return;
    setActionError(null);
    removeMutation.mutate();
  }

  return (
    <div className="flex flex-1 flex-col w-full min-h-0">

      {/* Header */}
      <header className="px-5 pt-4 pb-5 lg:pt-6 lg:px-0 bg-bg-header border-b border-border">
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
                  {student.groupColorManual ? ' · manuel' : ''}
                </span>
                {effectiveClassId != null && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/teacher/groupes?classId=${effectiveClassId}`)
                    }
                    className="text-xs text-brand-end underline underline-offset-2"
                  >
                    Changer de groupe
                  </button>
                )}
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
      <main className="flex-1 overflow-y-auto px-5 py-4 lg:px-0 flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-alert-surface border border-alert">
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
            {blockage && (
              <section className="rounded-2xl border border-border border-l-[3px] border-l-brand-end bg-accent-surface p-4">
                <p className="text-sm font-bold text-text-primary mb-1">
                  Blocage détecté sur « {blockage.trickName} »
                </p>
                <p className="text-xs text-text-secondary mb-3">
                  {blockage.attemptCount} tentative{blockage.attemptCount > 1 ? 's' : ''} sans
                  progression sur la figure courante du parcours.
                </p>
                {blockagePrerequisites.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-text-primary mb-1">
                      Figures prérequises suggérées
                    </p>
                    <ul className="text-xs text-text-secondary list-disc pl-4 space-y-0.5">
                      {blockagePrerequisites.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {effectiveClassId != null && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/teacher/groupes?classId=${effectiveClassId}`)
                      }
                      className="text-xs font-semibold text-brand-end underline underline-offset-2"
                    >
                      Changer de groupe →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (effectiveClassId) params.set('classId', String(effectiveClassId));
                      if (student.id) params.set('studentId', String(student.id));
                      if (selectedPathId) params.set('pathId', String(selectedPathId));
                      navigate(`/teacher/parcours/assigner?${params.toString()}`);
                    }}
                    className="text-xs font-semibold text-brand-end underline underline-offset-2"
                  >
                    Modifier le parcours assigné →
                  </button>
                </div>
              </section>
            )}

            {/* KPIs */}
            <section>
              <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                Statistiques
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: `${progressPct}%`, label: 'Progression', iconName: 'chart-bar' as IconName, iconLabel: 'progression' },
                  {
                    value: student.groupColor === 'VERT' ? 'Avance' : student.groupColor === 'ORANGE' ? 'Normal' : 'Attention',
                    label: 'Groupe',
                    iconName: (student.groupColor === 'ROUGE' ? 'alert-warning' : 'tip-target') as IconName,
                    iconLabel: 'groupe',
                  },
                  {
                    value: student.lastActivityAt ? new Date(student.lastActivityAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—',
                    label: 'Dernière activité',
                    iconName: 'timer' as IconName,
                    iconLabel: 'dernière activité',
                  },
                ]).map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
                  >
                    <AppIcon name={stat.iconName} size={18} label={stat.iconLabel} />
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

            {effectiveAssignment && (
              <section className="p-4 rounded-2xl bg-bg-card border border-border">
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-2">
                  Parcours actif
                </h2>
                <p className="font-bold text-text-primary text-sm">{effectiveAssignment.pathName}</p>
                <p className="text-xs text-text-muted mt-1">
                  {effectiveAssignment.assignmentSource === 'STUDENT'
                    ? 'Assignation individuelle'
                    : 'Hérité de la classe'}
                  {effectiveAssignment.startDate
                    ? ` · depuis le ${new Date(effectiveAssignment.startDate).toLocaleDateString('fr-FR')}`
                    : ''}
                </p>
                {effectiveAssignment.assignmentSource === 'STUDENT' && effectiveClassId && (
                  <button
                    type="button"
                    disabled={unassignMutation.isPending}
                    onClick={() => {
                      if (!window.confirm('Retirer l\'assignation individuelle ? L\'élève repassera sur le parcours de classe.')) {
                        return;
                      }
                      setActionError(null);
                      unassignMutation.mutate();
                    }}
                    className="mt-3 text-xs font-semibold text-alert underline underline-offset-2 disabled:opacity-60"
                  >
                    {unassignMutation.isPending ? 'Retrait…' : 'Retirer l\'assignation individuelle'}
                  </button>
                )}
              </section>
            )}

            {/* Parcours disponibles */}
            {paths.length > 0 && (
              <section>
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                  Catalogue des parcours
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

            {/* Progression sur le parcours */}
            {(assignedPaths.length > 0 || selectedPathId) && (
              <section>
                <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
                  Progression sur le parcours
                </h2>

                {assignedPaths.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
                    {assignedPaths.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPathId(p.id)}
                        className={[
                          'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                          selectedPathId === p.id
                            ? 'jf-chip-active border-transparent text-white'
                            : 'border-border bg-bg-card text-text-muted',
                        ].join(' ')}
                      >
                        {p.pathName}
                      </button>
                    ))}
                  </div>
                )}

                {selectedPath && (
                  <div className="p-4 rounded-2xl bg-bg-card border border-border mb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-text-primary text-sm truncate">{selectedPath.pathName}</p>
                        <p className="text-xs text-text-muted mt-1">
                          {selectedPath.stepCount} figure{selectedPath.stepCount > 1 ? 's' : ''}
                          {selectedPath.targetLevel ? ` · ${selectedPath.targetLevel}` : ''}
                        </p>
                      </div>
                      {effectiveClassId && selectedPathId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/teacher/classe/${effectiveClassId}/parcours/${selectedPathId}`)}
                          className="jf-btn-secondary jf-btn-secondary-sm shrink-0 rounded-xl"
                        >
                          Voir ce parcours →
                        </button>
                      )}
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={pathProgress?.completionPercent ?? 0} color={chipColor} height="8px" />
                    </div>
                  </div>
                )}

                {pathProgressQuery.isLoading ? (
                  <div className="h-24 rounded-2xl animate-pulse bg-bg-card" />
                ) : !pathProgress ? (
                  <div className="p-4 rounded-2xl bg-bg-card border border-border text-sm text-text-secondary">
                    Aucune donnée de progression pour ce parcours.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {pathProgress.trickDetails.map((t) => {
                      const key = (t.status as keyof typeof STATUS_CONFIG);
                      const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.NOT_STARTED;
                      return (
                        <div
                          key={t.trickId}
                          className={[
                            'p-3 rounded-2xl bg-bg-card border flex items-center justify-between gap-3',
                            t.blocked
                              ? 'border-brand-end/60 border-l-[3px] border-l-brand-end'
                              : 'border-border',
                          ].join(' ')}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{t.trickName}</p>
                            <p className={`text-xs ${cfg.textClass}`}>
                              <ProgressStatusIcon status={key} size={14} className="inline shrink-0" /> {cfg.label}
                              {t.attemptCount > 0 && (
                                <span className="text-text-muted">
                                  {' '}
                                  · {t.attemptCount} tentative{t.attemptCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bgClass}`}>
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Actions */}
            <section className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (effectiveClassId) params.set('classId', String(effectiveClassId));
                  if (student?.id) params.set('studentId', String(student.id));
                  if (selectedPathId) params.set('pathId', String(selectedPathId));
                  navigate(`/teacher/parcours/assigner?${params.toString()}`);
                }}
                className="jf-btn-primary w-full min-h-11 rounded-2xl py-3 text-sm"
              >
                Assigner un parcours à cet élève
              </button>
              <button
                type="button"
                onClick={() => {
                  const qs = effectiveClassId ? `?classId=${effectiveClassId}` : '';
                  navigate(`/teacher/eleves${qs}`);
                }}
                className="jf-btn-secondary w-full min-h-11 rounded-2xl py-3 text-sm"
              >
                Voir la liste des élèves
              </button>
              {effectiveClassId != null && (
                <button
                  type="button"
                  disabled={removeMutation.isPending}
                  onClick={() => void handleRemoveFromClass()}
                  className="w-full min-h-11 rounded-2xl py-3 text-sm font-semibold text-alert border border-alert bg-alert-surface hover:opacity-80 transition-opacity disabled:opacity-60"
                >
                  {removeMutation.isPending ? 'Retrait…' : 'Retirer de la classe'}
                </button>
              )}
            </section>
          </>
        )}
      </main>

    </div>
  );
}
