import { useState } from 'react';
import AppIcon from './icons/AppIcon';
import type { IconName } from './icons/iconRegistry';
import {
  isYoutubeUrl,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from '../utils/externalResource';

export interface YoutubeVideoCardProps {
  title: string;
  resourceUrl: string | null;
  metaLabel?: string | null;
  subtitle?: string | null;
  tags?: string[];
  isActive: boolean;
  disabled?: boolean;
  onPlay: () => void;
  fallbackIcon?: IconName;
  /** Couleur hex pour le dégradé si pas de miniature YouTube. */
  fallbackAccent?: string;
}

export default function YoutubeVideoCard({
  title,
  resourceUrl,
  metaLabel,
  subtitle,
  tags = [],
  isActive,
  disabled = false,
  onPlay,
  fallbackIcon = 'play',
  fallbackAccent = '#8B2BE2',
}: YoutubeVideoCardProps) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const embedSrc =
    isActive && resourceUrl ? youtubeEmbedUrl(resourceUrl) : null;
  const thumbSrc =
    resourceUrl && isYoutubeUrl(resourceUrl) && !thumbFailed
      ? youtubeThumbnailUrl(resourceUrl)
      : null;
  const levelTag = tags[0];
  const extraTags = tags.slice(1);

  return (
    <div className="rounded-2xl overflow-hidden bg-bg-card border border-border">
      {embedSrc ? (
        <div className="relative aspect-video bg-black">
          <iframe
            title={title}
            src={embedSrc}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Lire ${title}`}
          disabled={disabled || !resourceUrl}
          onClick={onPlay}
          className="relative block w-full aspect-video disabled:opacity-50"
        >
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${fallbackAccent}40, var(--color-bg-card))`,
              }}
            >
              <AppIcon name={fallbackIcon} size={56} label={title} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/25" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-lg">
              <AppIcon name="play" size={28} className="text-white ml-1" label="Lire" />
            </div>
          </div>
        </button>
      )}

      <div className="p-3">
        <p className="font-bold text-text-primary text-sm mb-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-text-secondary mb-1 line-clamp-2">{subtitle}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {metaLabel && <span className="text-xs text-text-muted">{metaLabel}</span>}
          {levelTag && (
            <span className="text-xs px-2 py-0.5 rounded-full text-success bg-success/10 border border-success/30">
              {levelTag}
            </span>
          )}
          {extraTags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-border text-text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
