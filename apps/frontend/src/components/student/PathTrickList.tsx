import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LearningPath } from '../../api/studentApi';
import { resolveTrickIdsForPath } from '../../utils/catalogueTrickLookup';

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

const STATUS_LABEL: Record<ProgressStatus, string> = {
  NOT_STARTED: 'À faire',
  IN_PROGRESS: 'En cours',
  MASTERED: 'Maîtrisée',
};

export default function PathTrickList({
  path,
  progressByTrickId,
}: {
  path: LearningPath;
  progressByTrickId: Record<number, ProgressStatus>;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<
    { name: string; trickId: number | null; status: ProgressStatus }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    resolveTrickIdsForPath(path.trickNames).then((idByName) => {
      if (cancelled) return;
      setRows(
        path.trickNames.map((name) => {
          const trickId = idByName.get(name) ?? null;
          const status = trickId != null ? (progressByTrickId[trickId] ?? 'NOT_STARTED') : 'NOT_STARTED';
          return { name, trickId, status };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [path.trickNames, progressByTrickId]);

  if (path.trickNames.length === 0) {
    return <p className="text-xs text-text-muted">Aucune étape dans ce parcours.</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {rows.map((row, index) => (
        <li key={`${row.name}-${index}`}>
          {row.trickId != null ? (
            <button
              type="button"
              onClick={() => navigate(`/student/trick/${row.trickId}`)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left bg-bg-primary border border-border hover:border-brand/40 transition-colors min-h-11"
            >
              <span className="text-xs text-text-primary truncate">
                {index + 1}. {row.name}
              </span>
              <span className="text-[0.65rem] font-semibold text-brand-end shrink-0">
                {STATUS_LABEL[row.status]}
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-bg-primary border border-border opacity-80">
              <span className="text-xs text-text-muted truncate">
                {index + 1}. {row.name}
              </span>
              <span className="text-[0.65rem] text-text-muted shrink-0">Hors cache</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
