import { LEVEL_LABELS } from '../../api/catalogueApi';

/** Libellés des niveaux de parcours (API enseignant). */
export const PATH_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  EXPERT: 'Expert',
};

const PILL_CHIP_CLASS: Record<string, string> = {
  Beginner: 'text-success bg-success/10 border border-success/30',
  Intermediate: 'text-brand-end bg-brand/12 border border-brand/35',
  Advanced: 'text-brand bg-brand/10 border border-brand/30',
  Expert: 'text-alert bg-alert/10 border border-alert/30',
  BEGINNER: 'text-success bg-success/10 border border-success/30',
  INTERMEDIATE: 'text-brand-end bg-brand/12 border border-brand/35',
  ADVANCED: 'text-brand bg-brand/10 border border-brand/30',
  EXPERT: 'text-alert bg-alert/10 border border-alert/30',
  Débutant: 'text-success bg-success/10 border border-success/30',
  Intermédiaire: 'text-brand-end bg-brand/12 border border-brand/35',
  Avancé: 'text-brand bg-brand/10 border border-brand/30',
};

const CATALOGUE_CHIP_CLASS: Record<string, string> = {
  Beginner: 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]',
  Intermediate: 'text-[#C724B1] bg-[rgba(139,43,226,0.14)]',
  Advanced: 'text-[#8B2BE2] bg-[rgba(139,43,226,0.12)]',
  Expert: 'text-[#FF4D4D] bg-[rgba(255,77,77,0.12)]',
};

export type LevelChipVariant = 'pill' | 'catalogue';

export function resolveLevelLabel(level: string | null | undefined): string | null {
  if (!level) return null;
  return LEVEL_LABELS[level] ?? PATH_LEVEL_LABELS[level] ?? level;
}

export function levelChipClassName(
  level: string | null | undefined,
  variant: LevelChipVariant = 'pill',
): string {
  if (!level) return 'text-text-secondary bg-border';
  const map = variant === 'catalogue' ? CATALOGUE_CHIP_CLASS : PILL_CHIP_CLASS;
  return map[level] ?? PILL_CHIP_CLASS.Beginner;
}
