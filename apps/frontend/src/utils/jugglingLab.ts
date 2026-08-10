import type { TrickResponse } from '../api/catalogueApi';

/**
 * Animateur web public Juggling Lab (HTML + canvas, plus un GIF serveur).
 * @see https://jugglinglab.org/html/animinfo.html
 */
export const JUGGLING_LAB_PUBLIC_ANIM = 'https://jugglinglab.org/anim';

/** @deprecated Ancien proxy GIF — conservé pour compat tests / SW ; préférer {@link JUGGLING_LAB_PUBLIC_ANIM}. */
export const JUGGLING_LAB_ANIM_BASE = '/api/juggling-lab/anim';

export type JugglingLabGifOptions = {
  width?: number;
  height?: number;
  slowdown?: number;
};

/**
 * Construit l’URL de la page animateur Juggling Lab à embarquer en iframe.
 *
 * Formats supportés (doc JL) :
 * - siteswap simple : `441` → `?pattern=441`
 * - pattern enrichi : `3;hands=(-25)…` → `?pattern=3;hands=(-25)…`
 * - déjà préfixé : `pattern=3;slowdown=2` → conservé tel quel
 */
export function buildJugglingLabAnimPageUrl(
  pattern: string,
  options: JugglingLabGifOptions = {},
): string {
  const p = pattern.trim();
  if (!p) {
    throw new Error('jugglingLab: pattern vide');
  }
  if (/^https?:\/\//i.test(p)) {
    return p;
  }

  const queryBody = /^(pattern|jml)=/i.test(p) ? p : `pattern=${p}`;
  const extras: string[] = [];
  const lower = queryBody.toLowerCase();

  // width/height sont ignorés par l’animateur web (doc JL) — on ne les envoie pas.
  if (options.slowdown != null && !lower.includes('slowdown=')) {
    extras.push(`slowdown=${options.slowdown}`);
  }

  const query = extras.length > 0 ? `${queryBody};${extras.join(';')}` : queryBody;
  return `${JUGGLING_LAB_PUBLIC_ANIM}?${query}`;
}

/**
 * @deprecated Utiliser {@link buildJugglingLabAnimPageUrl}. Alias conservé pour appels existants.
 */
export function buildJugglingLabGifUrl(
  pattern: string,
  options: JugglingLabGifOptions = {},
): string {
  return buildJugglingLabAnimPageUrl(pattern, options);
}

export type ResolvedTrickAnimation =
  | { kind: 'iframe'; src: string }
  | { kind: 'img'; src: string; alt: string };

function isDirectGifUrl(url: string): boolean {
  return /\.gif([?#]|$)/i.test(url) || /storage\.googleapis\.com/i.test(url);
}

/**
 * URL explicite en base :
 * - fichier GIF / GCS → `<img>`
 * - sinon (page animateur, lien Share JL…) → `<iframe>`
 *
 * Sinon, siteswap / pattern → iframe vers jugglinglab.org/anim.
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
    if (isDirectGifUrl(custom)) {
      return {
        kind: 'img',
        src: custom,
        alt: `Animation Juggling Lab — ${trick.name}`,
      };
    }
    return { kind: 'iframe', src: custom };
  }

  const pattern = trick.jugglingLabPattern?.trim() || trick.siteswap?.trim();
  if (!pattern) return null;

  return {
    kind: 'iframe',
    src: buildJugglingLabAnimPageUrl(pattern, gifOptions),
  };
}

/** True si l’URL pointe vers l’animateur public (lourd à embarquer en liste). */
export function isJugglingLabPublicAnimator(src: string): boolean {
  return /jugglinglab\.org\/anim/i.test(src);
}
