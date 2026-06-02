import type { ClassStudentPathOverview } from '../../api/teacherApi';
import { pathAssignmentSourceLabel } from '../../utils/pathOverview';

interface StudentPathSummaryProps {
  overview?: ClassStudentPathOverview | null;
  /** Afficher le pourcentage sur le parcours à droite (liste compacte). */
  showPathPercent?: boolean;
  className?: string;
}

export default function StudentPathSummary({
  overview,
  showPathPercent = false,
  className = '',
}: StudentPathSummaryProps) {
  if (!overview?.pathName) {
    return (
      <p className={`text-xs text-text-muted ${className}`.trim()}>
        Aucun parcours assigné
      </p>
    );
  }

  const sourceLabel = pathAssignmentSourceLabel(overview.assignmentSource);

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className="text-xs text-text-muted truncate">
        <span className="text-text-secondary">{overview.pathName}</span>
        {sourceLabel && (
          <span className="text-brand-end"> · {sourceLabel}</span>
        )}
        {showPathPercent && (
          <span className="text-text-primary font-semibold">
            {' '}
            · {overview.completionPercent}%
          </span>
        )}
      </p>
    </div>
  );
}
