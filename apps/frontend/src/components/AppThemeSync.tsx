import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDarkModeEnabled } from '../utils/preferences';
import { applyDocumentTheme, THEME_CHANGE_EVENT } from '../utils/theme';

const THEMED_PREFIXES = ['/student', '/onboarding', '/teacher'] as const;

function isThemedRoute(pathname: string): boolean {
  return THEMED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Applique le thème clair / foncé sur les zones élève et enseignant.
 * Login et admin restent en thème sombre par défaut.
 */
export default function AppThemeSync() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const themed = isThemedRoute(pathname);

  useEffect(() => {
    if (!themed) {
      applyDocumentTheme(true);
      return;
    }
    applyDocumentTheme(getDarkModeEnabled(user?.id));
  }, [themed, user?.id]);

  useEffect(() => {
    const sync = () => {
      if (!themed) return;
      applyDocumentTheme(getDarkModeEnabled(user?.id));
    };
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, [themed, user?.id]);

  return null;
}
