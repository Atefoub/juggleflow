import AppIcon from './AppIcon';
import {
  PROGRESS_STATUS_ICON,
  type ProgressStatusKey,
} from './iconRegistry';

export default function ProgressStatusIcon({
  status,
  size = 14,
  className,
}: {
  status: ProgressStatusKey;
  size?: number;
  className?: string;
}) {
  if (status === 'NOT_STARTED') {
    return (
      <AppIcon
        name="status-locked"
        size={size}
        className={className}
        label="Non commencé"
      />
    );
  }
  const name = PROGRESS_STATUS_ICON[status];
  const label = status === 'MASTERED' ? 'Maîtrisé' : 'En cours';
  return <AppIcon name={name} size={size} className={className} label={label} />;
}
