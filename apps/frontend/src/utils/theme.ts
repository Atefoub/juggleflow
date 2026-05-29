import { getDarkModeEnabled } from './preferences';

export const THEME_CHANGE_EVENT = 'jf-theme-change';

const THEME_COLOR = {
  dark: '#0A0E2A',
  light: '#F7F8FA',
} as const;

/**
 * Applique le thème sur `<html>`.
 * Sombre par défaut (pas d’attribut `data-theme`) ; clair uniquement si `darkMode === false`.
 */
export function applyDocumentTheme(darkMode: boolean): void {
  const root = document.documentElement;
  if (darkMode !== false) {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', 'light');
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = darkMode ? THEME_COLOR.dark : THEME_COLOR.light;
  }
}

export function notifyThemeChange(): void {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** Initialise le thème avant le premier rendu React (évite un flash). */
export function initDocumentTheme(userId?: number | string | null): void {
  applyDocumentTheme(getDarkModeEnabled(userId));
}
