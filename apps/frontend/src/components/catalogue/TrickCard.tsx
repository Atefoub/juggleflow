import AppIcon from '../icons/AppIcon';
import type { TrickResponse } from '../../api/catalogueApi';
import AnimationPreview from './AnimationPreview';
import DifficultyChip from './DifficultyChip';
import type { TrickProgressStatus } from './progressStatus';
import ProgressChip from './ProgressChip';
import StarRating from './StarRating';

export interface TrickCardProps {
  trick: TrickResponse;
  status: TrickProgressStatus;
  onOpen: (trick: TrickResponse) => void;
}

export function TrickCard({ trick, status, onOpen }: TrickCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-border">
      <AnimationPreview trick={trick} variant="list" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-bold text-white text-sm leading-tight truncate">{trick.name}</p>
          <div className="flex items-center gap-2 shrink-0">
            <ProgressChip status={status} />
            {trick.popular && (
              <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full bg-[#1A1028] text-brand-end border border-brand/35">
                <AppIcon name="tag-popular" size={12} className="inline shrink-0" label="Populaire" />{' '}
                Populaire
              </span>
            )}
          </div>
        </div>
        <DifficultyChip level={trick.levelName} variant="catalogue" />
        <div className="mt-1.5 mb-2">
          <StarRating score={trick.difficultyScore} size="sm" />
        </div>
        {trick.siteswap && (
          <p className="text-[0.6rem] mb-2 text-text-muted">
            Siteswap : <code className="text-text-secondary">{trick.siteswap}</code>
          </p>
        )}
        <p className="text-xs leading-relaxed line-clamp-2 text-text-secondary">{trick.description}</p>
        {trick.prerequisiteNames.length > 0 && (
          <p className="text-[0.6rem] mt-1.5 text-text-muted">
            Prérequis : {trick.prerequisiteNames.join(', ')}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(trick)}
        aria-label={`Voir la figure ${trick.name}`}
        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold text-white bg-linear-to-br from-[#8B2BE2] to-[#C724B1] transition-opacity hover:opacity-80"
      >
        →
      </button>
    </div>
  );
}

export function TrickCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-border animate-pulse">
      <div className="rounded-xl shrink-0 w-20 h-20 bg-border" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 rounded bg-border w-3/5" />
        <div className="h-3 rounded bg-border w-[35%]" />
        <div className="h-3 rounded bg-border w-[90%]" />
        <div className="h-3 rounded bg-border w-3/4" />
      </div>
    </div>
  );
}
