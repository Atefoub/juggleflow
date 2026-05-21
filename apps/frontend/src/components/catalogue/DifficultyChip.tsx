import {
  levelChipClassName,
  resolveLevelLabel,
  type LevelChipVariant,
} from './trickLevelStyles';

export interface DifficultyChipProps {
  level: string | null | undefined;
  variant?: LevelChipVariant;
  className?: string;
}

export default function DifficultyChip({
  level,
  variant = 'pill',
  className = '',
}: DifficultyChipProps) {
  const label = resolveLevelLabel(level);
  if (!label) return null;

  const sizeClass =
    variant === 'catalogue'
      ? 'text-[0.6rem] font-bold px-2 py-0.5 rounded-full'
      : 'text-xs px-2 py-0.5 rounded-full font-semibold';

  return (
    <span
      className={[
        sizeClass,
        levelChipClassName(level, variant),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  );
}
