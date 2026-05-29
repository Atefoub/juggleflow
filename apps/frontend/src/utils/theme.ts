import { getDarkModeEnabled } from './preferences';

export const THEME_CHANGE_EVENT = 'jf-theme-change';

const THEME_COLOR = {
  dark: '#0A0E2A',
  light: '#F7F8FA',
} as const;

/** Valeur API/local : seul `false` = thème clair ; `undefined` = ne pas écraser le local. */
export function resolveDarkModeEnabled(value: boolean | undefined | null): boolean {
  return value !== false;
}

/** Applique le thème sur `<html>`. `false` = clair, `true` = sombre. */
export function applyDocumentTheme(darkModeEnabled: boolean): void {
  const root = document.documentElement;
  const useLight = darkModeEnabled === false;

  if (useLight) {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = useLight ? THEME_COLOR.light : THEME_COLOR.dark;
  }
}

export function notifyThemeChange(): void {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** Initialise le thème avant le premier rendu React. */
export function initDocumentTheme(userId?: number | string | null): void {
  applyDocumentTheme(getDarkModeEnabled(userId));
}
