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

  const lightMode = !darkMode;

  return (
    <div
      className={[
        'flex items-center justify-between gap-3',
        className,
      ].join(' ')}
    >
      <div className="flex items-center gap-3 min-w-0">
        <AppIcon name="moon" size={20} label="Apparence" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">Thème clair</p>
          <p className="text-xs text-text-muted">
            {lightMode
              ? 'Mode clair activé'
              : 'Thème sombre par défaut'}
          </p>
        </div>
      </div>
      <ToggleSwitch
        checked={lightMode}
        disabled={busy}
        aria-label={
          lightMode ? 'Revenir au thème sombre' : 'Activer le thème clair'
        }
        onChange={() => {
          void (async () => {
            if (busy) return;
            const enableLight = !lightMode;
            const nextDarkMode = !enableLight;
            setBusy(true);
            applyLocal(nextDarkMode);
            try {
              if (persistOnline) {
                const prefs = await persistOnline(nextDarkMode);
                applyLocal(prefs.darkModeEnabled);
              }
            } catch {
              applyLocal(!nextDarkMode);
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
    </div>
  );
}
