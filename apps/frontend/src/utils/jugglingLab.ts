import type { TrickResponse } from '../api/catalogueApi';

/** Base du serveur GIF documenté : https://jugglinglab.org/html/animinfo.html */
export const JUGGLING_LAB_ANIM_BASE = 'https://jugglinglab.org/anim';

export type JugglingLabGifOptions = {
  width?: number;
  height?: number;
  slowdown?: number;
  /**
   * Si true (défaut), le serveur redirige vers le fichier GIF — adapté aux balises <img>.
   * @see https://jugglinglab.org/html/animinfo.html (variable redirect)
   */
  redirect?: boolean;
};

/**
 * Construit l’URL du GIF Juggling Lab à partir d’un siteswap (notation généralisée JL).
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
  params.set('redirect', String(options.redirect ?? true));
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
  trick: Pick<TrickResponse, 'name' | 'jugglingLabAnimationUrl' | 'siteswap'>,
  gifOptions?: JugglingLabGifOptions,
): ResolvedTrickAnimation | null {
  const custom = trick.jugglingLabAnimationUrl?.trim();
  if (custom) {
    return { kind: 'iframe', src: custom };
  }
  const sw = trick.siteswap?.trim();
  if (!sw) return null;
  return {
    kind: 'img',
    src: buildJugglingLabGifUrl(sw, gifOptions),
    alt: `Animation Juggling Lab — siteswap ${sw} — ${trick.name}`,
  };
}
