import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { applyDocumentTheme, resolveDarkModeEnabled } from './theme';

describe('theme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('resolveDarkModeEnabled treats only false as light preference', () => {
    expect(resolveDarkModeEnabled(true)).toBe(true);
    expect(resolveDarkModeEnabled(false)).toBe(false);
    expect(resolveDarkModeEnabled(undefined)).toBe(true);
    expect(resolveDarkModeEnabled(null)).toBe(true);
  });

  it('applyDocumentTheme sets data-theme=light only when darkModeEnabled is false', () => {
    applyDocumentTheme(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    applyDocumentTheme(true);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });
});
