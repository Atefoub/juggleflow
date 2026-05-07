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

export function resetPreferences(userId?: number | string | null): void {
  try {
    localStorage.removeItem(offlineKey(userId));
    localStorage.removeItem('pref_offline_mode');
  } catch {
    // Silently ignore
  }
}

