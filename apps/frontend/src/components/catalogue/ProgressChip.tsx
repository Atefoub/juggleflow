import ProgressStatusIcon from '../icons/ProgressStatusIcon';
import type { TrickProgressStatus } from './progressStatus';

export interface ProgressChipProps {
  status: TrickProgressStatus;
  className?: string;
}

export default function ProgressChip({ status, className = '' }: ProgressChipProps) {
  if (status === 'NOT_STARTED') return null;

  const cfg =
    status === 'MASTERED'
      ? { label: 'Maîtrisée', cls: 'bg-success/10 text-success border border-success/30' }
      : { label: 'En cours', cls: 'bg-brand/10 text-brand-end border border-brand/30' };

  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-[0.55rem] font-bold px-2 py-0.5 rounded-full',
        cfg.cls,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ProgressStatusIcon status={status} size={12} className="shrink-0" />
      {cfg.label}
    </span>
  );
}
