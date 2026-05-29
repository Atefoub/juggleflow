/**
 * preferences.ts
 *
 * Stockage local de préférences non sensibles.
 *
 * Contraintes "appareil partagé" (école / tablette) :
 * - Les préférences sont stockées par userId (pas de PII).
 * - Elles sont nettoyées au logout (cf. AuthContext).
 */

function offlineKey(userId?: number | string | null): string {
  return userId != null ? `pref_offline_mode:${userId}` : 'pref_offline_mode';
}

function practiceRemindersKey(userId?: number | string | null): string {
  return userId != null ? `pref_practice_reminders:${userId}` : 'pref_practice_reminders';
}

function darkModeKey(userId?: number | string | null): string {
  return userId != null ? `pref_dark_mode:${userId}` : 'pref_dark_mode';
}

export function getOfflineMode(userId?: number | string | null): boolean {
  try {
    return localStorage.getItem(offlineKey(userId)) === 'true';
  } catch {
    return false;
  }
}

export function setOfflineMode(enabled: boolean, userId?: number | string | null): void {
  try {
    localStorage.setItem(offlineKey(userId), enabled ? 'true' : 'false');
  } catch {
    // Silently ignore — ne bloque pas l'UI
  }
}

export function getPracticeRemindersEnabled(userId?: number | string | null): boolean {
  try {
    const raw = localStorage.getItem(practiceRemindersKey(userId));
    if (raw == null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setPracticeRemindersEnabled(
  enabled: boolean,
  userId?: number | string | null,
): void {
  try {
    localStorage.setItem(practiceRemindersKey(userId), enabled ? 'true' : 'false');
  } catch {
    // Silently ignore
  }
}

/** Mode foncé activé par défaut (thème sombre historique). */
export function getDarkModeEnabled(userId?: number | string | null): boolean {
  try {
    const raw = localStorage.getItem(darkModeKey(userId));
    if (raw == null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setDarkModeEnabled(
  enabled: boolean,
  userId?: number | string | null,
): void {
  try {
    localStorage.setItem(darkModeKey(userId), enabled ? 'true' : 'false');
  } catch {
    // Silently ignore
  }
}

export function resetPreferences(userId?: number | string | null): void {
  try {
    localStorage.removeItem(offlineKey(userId));
    localStorage.removeItem('pref_offline_mode');
    localStorage.removeItem(practiceRemindersKey(userId));
    localStorage.removeItem('pref_practice_reminders');
    localStorage.removeItem(darkModeKey(userId));
    localStorage.removeItem('pref_dark_mode');
  } catch {
    // Silently ignore
  }
}

