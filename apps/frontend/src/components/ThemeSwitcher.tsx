import { useEffect, useState } from 'react';
import AppIcon from './icons/AppIcon';
import ToggleSwitch from './ToggleSwitch';
import {
  getDarkModeEnabled,
  setDarkModeEnabled,
} from '../utils/preferences';
import {
  applyDocumentTheme,
  notifyThemeChange,
  THEME_CHANGE_EVENT,
} from '../utils/theme';
import { apiErrorMessage } from '../utils/apiErrorMessage';

type ThemeSwitcherProps = {
  userId?: number | string | null;
  /** Sync serveur (élève uniquement). */
  persistOnline?: (darkModeEnabled: boolean) => Promise<{ darkModeEnabled?: boolean }>;
  embedded?: boolean;
  className?: string;
};

export default function ThemeSwitcher({
  userId,
  persistOnline,
  embedded = false,
  className = '',
}: ThemeSwitcherProps) {
  const [darkMode, setDarkMode] = useState(() => getDarkModeEnabled(userId));
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const lightMode = !darkMode;

  useEffect(() => {
    setDarkMode(getDarkModeEnabled(userId));
  }, [userId]);

  useEffect(() => {
    const syncFromStorage = () => setDarkMode(getDarkModeEnabled(userId));
    window.addEventListener(THEME_CHANGE_EVENT, syncFromStorage);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncFromStorage);
  }, [userId]);

  const applyTheme = (darkModeEnabled: boolean) => {
    setDarkMode(darkModeEnabled);
    setDarkModeEnabled(darkModeEnabled, userId);
    applyDocumentTheme(darkModeEnabled);
    notifyThemeChange();
  };

  const handleToggle = () => {
    void (async () => {
      if (busy) return;
      const nextDark = !darkMode;
      setBusy(true);
      setHint(null);
      applyTheme(nextDark);

      if (!persistOnline) {
        setBusy(false);
        return;
      }

      try {
        const prefs = await persistOnline(nextDark);
        if (typeof prefs.darkModeEnabled === 'boolean') {
          applyTheme(prefs.darkModeEnabled);
        }
      } catch (err) {
        setHint(
          apiErrorMessage(
            err,
            'Impossible de sauvegarder ce réglage. Réessaie en ligne.',
          ),
        );
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <>
      <div
        className={[
          'flex items-center justify-between p-4',
          embedded ? '' : 'bg-bg-card',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex items-center gap-3">
          <AppIcon name="moon" size={20} label="Thème" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Thème clair</p>
            <p className="text-xs text-text-muted">
              {lightMode ? 'Mode clair activé' : 'Thème sombre actif'}
            </p>
          </div>
        </div>
        <ToggleSwitch
          checked={lightMode}
          disabled={busy}
          aria-label={lightMode ? 'Désactiver le thème clair' : 'Activer le thème clair'}
          onChange={handleToggle}
        />
      </div>
      {hint && (
        <p className="px-4 pb-3 text-xs text-alert bg-bg-card">{hint}</p>
      )}
    </>
  );
}
