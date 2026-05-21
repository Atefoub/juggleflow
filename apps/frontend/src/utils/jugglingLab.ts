import type { TrickResponse } from '../api/catalogueApi';

/**
 * Proxy API (redirection 302 vers le GIF réel).
 * Le serveur public jugglinglab.org/anim renvoie du HTML, pas une image directe.
 * @see https://jugglinglab.org/html/animinfo.html
 */
export const JUGGLING_LAB_ANIM_BASE = '/api/juggling-lab/anim';

export type JugglingLabGifOptions = {
  width?: number;
  height?: number;
  slowdown?: number;
};

/**
 * Construit l’URL du proxy GIF à partir d’un siteswap (notation généralisée JL).
 */
export function buildJugglingLabGifUrl(
  pattern: string,
  options: JugglingLabGifOptions = {},
): string {
  const p = pattern.trim();
  if (!p) {
    throw new Error('jugglingLab: pattern vide');
  }
  const params = new URLSearchParams();
  params.set('pattern', p);
  if (options.width != null) params.set('width', String(options.width));
  if (options.height != null) params.set('height', String(options.height));
  if (options.slowdown != null) params.set('slowdown', String(options.slowdown));
  return `${JUGGLING_LAB_ANIM_BASE}?${params.toString()}`;
}

export type ResolvedTrickAnimation =
  | { kind: 'iframe'; src: string }
  | { kind: 'img'; src: string; alt: string };

/**
 * URL explicite en base → iframe (lien complet / page résultat).
 * Sinon, si siteswap présent → GIF direct (redirect) pour <img>.
 */
export function resolveTrickAnimation(
  trick: Pick<
    TrickResponse,
    'name' | 'jugglingLabAnimationUrl' | 'jugglingLabPattern' | 'siteswap'
  >,
  gifOptions?: JugglingLabGifOptions,
): ResolvedTrickAnimation | null {
  const custom = trick.jugglingLabAnimationUrl?.trim();
  if (custom) {
    return { kind: 'iframe', src: custom };
  }
  const pattern = trick.jugglingLabPattern?.trim() || trick.siteswap?.trim();
  if (!pattern) return null;
  return {
    kind: 'img',
    src: buildJugglingLabGifUrl(pattern, gifOptions),
    alt: `Animation Juggling Lab — ${trick.name}`,
  };
}
