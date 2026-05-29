import AppIcon from '../icons/AppIcon';
import type { TrickResponse } from '../../api/catalogueApi';
import {
  resolveTrickAnimation,
  type JugglingLabGifOptions,
  type ResolvedTrickAnimation,
} from '../../utils/jugglingLab';

export type AnimationPreviewVariant = 'list' | 'tile' | 'detail' | 'session';

type VariantConfig = {
  gif: JugglingLabGifOptions;
  pointerEventsNone: boolean;
  emptyFallback: 'placeholder' | 'message' | 'hidden';
  placeholderIcon: number;
  emptyFrameClass?: string;
  imgClass: string;
  iframeClass: string;
  wrapper?: 'card' | 'session-section';
};

const VARIANT: Record<AnimationPreviewVariant, VariantConfig> = {
  list: {
    gif: { width: 200, height: 225, slowdown: 2 },
    pointerEventsNone: false,
    emptyFallback: 'placeholder',
    placeholderIcon: 36,
    imgClass: 'rounded-xl shrink-0 w-20 h-20 object-cover bg-bg-input',
    iframeClass: 'rounded-xl shrink-0 w-20 h-20 bg-bg-input border-0',
  },
  tile: {
    gif: { width: 240, height: 270, slowdown: 2 },
    pointerEventsNone: true,
    emptyFallback: 'placeholder',
    placeholderIcon: 32,
    imgClass: 'w-full h-20 object-cover rounded-xl bg-bg-input',
    iframeClass: 'w-full h-20 border-0 rounded-xl bg-bg-input',
  },
  detail: {
    gif: { width: 400, height: 450, slowdown: 2 },
    pointerEventsNone: false,
    emptyFallback: 'message',
    placeholderIcon: 48,
    emptyFrameClass:
      'rounded-2xl bg-bg-card border border-border h-48 flex flex-col items-center justify-center gap-2',
    imgClass: 'w-full max-h-72 object-contain bg-bg-input',
    iframeClass: 'w-full h-48 border-none',
    wrapper: 'card',
  },
  session: {
    gif: { width: 320, height: 360, slowdown: 2 },
    pointerEventsNone: false,
    emptyFallback: 'hidden',
    placeholderIcon: 40,
    imgClass: 'w-full max-h-44 object-contain bg-bg-input',
    iframeClass: 'w-full h-40 border-none',
    wrapper: 'session-section',
  },
};

export interface AnimationPreviewProps {
  trick: Pick<
    TrickResponse,
    'name' | 'siteswap' | 'jugglingLabAnimationUrl' | 'jugglingLabPattern'
  >;
  variant?: AnimationPreviewVariant;
  className?: string;
}

function JugglingLabCredit() {
  return (
    <p className="text-[0.65rem] text-text-muted mt-2 leading-relaxed">
      Animation générée par{' '}
      <a
        href="https://jugglinglab.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-text-secondary hover:text-text-primary"
      >
        Juggling Lab
      </a>{' '}
      (logiciel libre).{' '}
      <a
        href="https://jugglinglab.org/html/ssnotation.html"
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-text-secondary hover:text-text-primary"
      >
        Notation siteswap
      </a>
      .
    </p>
  );
}

function renderMedia(
  trick: AnimationPreviewProps['trick'],
  anim: ResolvedTrickAnimation,
  cfg: VariantConfig,
  className: string,
) {
  const pe = cfg.pointerEventsNone ? ' pointer-events-none' : '';

  if (anim.kind === 'iframe') {
    return (
      <iframe
        src={anim.src}
        title={`Animation de la figure ${trick.name}`}
        className={[cfg.iframeClass, pe, className].filter(Boolean).join(' ')}
        loading="lazy"
        scrolling="no"
      />
    );
  }

  return (
    <img
      src={anim.src}
      alt={anim.alt}
      className={[cfg.imgClass, pe, className].filter(Boolean).join(' ')}
      loading="lazy"
      decoding="async"
    />
  );
}

function renderCompactPlaceholder(
  variant: 'list' | 'tile',
  cfg: VariantConfig,
  className: string,
) {
  const frameClass =
    variant === 'tile'
      ? 'flex items-center justify-center rounded-xl mb-2 w-full h-20 bg-bg-input overflow-hidden'
      : 'flex items-center justify-center rounded-xl w-20 h-20 bg-bg-input shrink-0 text-text-muted';

  return (
    <div className={[frameClass, className].filter(Boolean).join(' ')} aria-hidden="true">
      <AppIcon name="juggler" size={cfg.placeholderIcon} label="" />
    </div>
  );
}

export default function AnimationPreview({
  trick,
  variant = 'list',
  className = '',
}: AnimationPreviewProps) {
  const cfg = VARIANT[variant];
  const resolved = resolveTrickAnimation(trick, cfg.gif);

  if (!resolved) {
    if (cfg.emptyFallback === 'hidden') return null;
    if (cfg.emptyFallback === 'message' && cfg.emptyFrameClass) {
      return (
        <section className={className || undefined}>
          <div className={cfg.emptyFrameClass}>
            <AppIcon
              name="juggler"
              size={cfg.placeholderIcon}
              className="text-text-muted"
              label="Jonglage"
            />
            <p className="text-xs text-text-muted">
              Animation non disponible (pas de siteswap ni d&apos;URL)
            </p>
          </div>
        </section>
      );
    }
    if (variant === 'list' || variant === 'tile') {
      return renderCompactPlaceholder(variant, cfg, className);
    }
    return null;
  }

  const media = renderMedia(trick, resolved, cfg, className);

  if (cfg.wrapper === 'card') {
    return (
      <section>
        <div className="rounded-2xl overflow-hidden bg-bg-card border border-border">
          {media}
        </div>
        {resolved.kind === 'img' && <JugglingLabCredit />}
      </section>
    );
  }

  if (cfg.wrapper === 'session-section') {
    return (
      <section className="rounded-2xl overflow-hidden bg-bg-card border border-border">
        <p className="text-[0.65rem] text-text-muted px-3 pt-3 uppercase tracking-wider">
          Aperçu
        </p>
        {media}
      </section>
    );
  }

  return media;
}
