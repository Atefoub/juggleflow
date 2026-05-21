import AppIcon from '../icons/AppIcon';
import { scoreToStars } from '../../api/catalogueApi';

export interface StarRatingProps {
  score: number;
  /** sm = catalogue (10px), md = fiche figure (14px) */
  size?: 'sm' | 'md';
  className?: string;
}

const ICON_SIZE = { sm: 10, md: 14 } as const;

export default function StarRating({
  score,
  size = 'md',
  className = '',
}: StarRatingProps) {
  const stars = scoreToStars(score);
  const iconSize = ICON_SIZE[size];

  return (
    <span
      className={['flex gap-0.5', className].filter(Boolean).join(' ')}
      aria-label={`Difficulté : ${score} sur 10`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <AppIcon
          key={i}
          name={i < stars ? 'star-filled' : 'star-outline'}
          size={iconSize}
          className={i < stars ? 'text-brand-end' : 'text-border'}
          label={i < stars ? 'étoile pleine' : 'étoile vide'}
        />
      ))}
    </span>
  );
}
