import { useEffect, useState } from 'react';
import AppIcon from './icons/AppIcon';
import ToggleSwitch from './ToggleSwitch';
import {
  getDarkModeEnabled,
  setDarkModeEnabled,
} from '../utils/preferences';
import { applyDocumentTheme, notifyThemeChange } from '../utils/theme';

type DarkModeToggleProps = {
  userId?: number | string | null;
  /** Sync serveur (élève uniquement). */
  persistOnline?: (enabled: boolean) => Promise<{ darkModeEnabled: boolean }>;
  className?: string;
};

export default function DarkModeToggle({
  userId,
  persistOnline,
  className = '',
}: DarkModeToggleProps) {
  const [darkMode, setDarkMode] = useState(() => getDarkModeEnabled(userId));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDarkMode(getDarkModeEnabled(userId));
  }, [userId]);

  const applyLocal = (enabled: boolean) => {
    setDarkMode(enabled);
    setDarkModeEnabled(enabled, userId);
    applyDocumentTheme(enabled);
    notifyThemeChange();
  };

  return (
    <div
      className={[
        'flex items-center justify-between gap-3',
        className,
      ].join(' ')}
    >
      <div className="flex items-center gap-3 min-w-0">
        <AppIcon name="moon" size={20} label="Mode foncé" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">Mode foncé</p>
          <p className="text-xs text-text-muted">
            {darkMode ? 'Thème sombre actif' : 'Thème clair actif'}
          </p>
        </div>
      </div>
      <ToggleSwitch
        checked={darkMode}
        disabled={busy}
        aria-label={darkMode ? 'Désactiver le mode foncé' : 'Activer le mode foncé'}
        onChange={() => {
          void (async () => {
            if (busy) return;
            const next = !darkMode;
            setBusy(true);
            applyLocal(next);
            try {
              if (persistOnline) {
                const prefs = await persistOnline(next);
                applyLocal(prefs.darkModeEnabled);
              }
            } catch {
              applyLocal(!next);
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
    </div>
  );
}
