import { describe, expect, it } from 'vitest';
import {
  buildJugglingLabAnimPageUrl,
  buildJugglingLabGifUrl,
  isJugglingLabPublicAnimator,
  resolveTrickAnimation,
} from './jugglingLab';

describe('jugglingLab', () => {
  it('buildJugglingLabAnimPageUrl pointe vers l’animateur public', () => {
    const url = buildJugglingLabAnimPageUrl('3', { slowdown: 2 });
    expect(url).toBe('https://jugglinglab.org/anim?pattern=3;slowdown=2');
  });

  it('buildJugglingLabAnimPageUrl conserve un pattern enrichi (hands)', () => {
    const url = buildJugglingLabAnimPageUrl(
      '3;hands=(-25)(2.5).(25)(-2.5).(-25)(0).',
      { slowdown: 2 },
    );
    expect(url).toBe(
      'https://jugglinglab.org/anim?pattern=3;hands=(-25)(2.5).(25)(-2.5).(-25)(0).;slowdown=2',
    );
  });

  it('buildJugglingLabGifUrl reste un alias de l’URL animateur', () => {
    expect(buildJugglingLabGifUrl('441', { slowdown: 2 })).toBe(
      buildJugglingLabAnimPageUrl('441', { slowdown: 2 }),
    );
  });

  it('resolveTrickAnimation utilise l’iframe public si pas d’URL custom', () => {
    const anim = resolveTrickAnimation({
      name: 'Cascade',
      siteswap: '3',
      jugglingLabPattern: null,
      jugglingLabAnimationUrl: null,
    });
    expect(anim?.kind).toBe('iframe');
    if (anim?.kind === 'iframe') {
      expect(anim.src).toContain('https://jugglinglab.org/anim?pattern=3');
      expect(isJugglingLabPublicAnimator(anim.src)).toBe(true);
    }
  });

  it('resolveTrickAnimation privilégie jugglingLabPattern', () => {
    const anim = resolveTrickAnimation({
      name: 'Mills Mess',
      siteswap: '3',
      jugglingLabPattern: '3;hands=(-25)(2.5).(25)(-2.5).(-25)(0).',
      jugglingLabAnimationUrl: null,
    });
    expect(anim?.kind).toBe('iframe');
    if (anim?.kind === 'iframe') {
      expect(anim.src).toContain('pattern=3;hands=');
    }
  });

  it('resolveTrickAnimation garde un GIF custom en <img>', () => {
    const anim = resolveTrickAnimation({
      name: 'Cascade',
      siteswap: '3',
      jugglingLabPattern: null,
      jugglingLabAnimationUrl: 'https://cdn.example.com/cascade.gif',
    });
    expect(anim).toEqual({
      kind: 'img',
      src: 'https://cdn.example.com/cascade.gif',
      alt: 'Animation Juggling Lab — Cascade',
    });
  });

  it('resolveTrickAnimation utilise une URL custom non-GIF en iframe', () => {
    const anim = resolveTrickAnimation({
      name: 'Cascade',
      siteswap: '3',
      jugglingLabPattern: null,
      jugglingLabAnimationUrl: 'https://jugglinglab.org/anim?pattern=3',
    });
    expect(anim).toEqual({
      kind: 'iframe',
      src: 'https://jugglinglab.org/anim?pattern=3',
    });
  });
});
