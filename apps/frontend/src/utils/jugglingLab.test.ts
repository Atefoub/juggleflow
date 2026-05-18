import { describe, expect, it } from 'vitest';
import { buildJugglingLabGifUrl, resolveTrickAnimation } from './jugglingLab';

describe('jugglingLab', () => {
  it('buildJugglingLabGifUrl pointe vers le proxy API', () => {
    const url = buildJugglingLabGifUrl('3', { width: 400, slowdown: 2 });
    expect(url).toMatch(/^\/api\/juggling-lab\/anim\?/);
    expect(url).toContain('pattern=3');
    expect(url).toContain('width=400');
    expect(url).toContain('slowdown=2');
  });

  it('resolveTrickAnimation utilise le siteswap si pas d’URL custom', () => {
    const anim = resolveTrickAnimation({
      name: 'Cascade',
      siteswap: '3',
      jugglingLabAnimationUrl: null,
    });
    expect(anim?.kind).toBe('img');
    if (anim?.kind === 'img') {
      expect(anim.src).toContain('/api/juggling-lab/anim');
    }
  });
});
