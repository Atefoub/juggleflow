/**
 * onboarding.ts — CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-30] Les clés localStorage liées à l'onboarding peuvent révéler
 *           l'identifiant d'un utilisateur précédent sur un appareil partagé
 *           (ordinateurs de classe, tablettes scolaires).
 *
 *           CORRECTION :
 *           1. resetOnboarding() est appelé par AuthContext.logout() avant
 *              la suppression du user.id.
 *           2. Les clés ne contiennent que l'userId numérique (pas de PII directe).
 *           3. Pas de token ni de données personnelles stockées ici.
 */

export type OnboardingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

function completedKey(userId?: number | string | null): string {
  return userId != null ? `onboarding_completed:${userId}` : 'onboarding_completed';
}

function levelKey(userId?: number | string | null): string {
  return userId != null ? `onboarding_level:${userId}` : 'onboarding_level';
}

export function isOnboardingCompleted(userId?: number | string | null): boolean {
  try {
    return localStorage.getItem(completedKey(userId)) === 'true';
  } catch {
    // localStorage peut être désactivé (mode privé strict, certains navigateurs)
    return false;
  }
}

export function getOnboardingLevel(userId?: number | string | null): OnboardingLevel | null {
  try {
    const v = localStorage.getItem(levelKey(userId));
    if (v === 'BEGINNER' || v === 'INTERMEDIATE' || v === 'ADVANCED') return v;
    return null;
  } catch {
    return null;
  }
}

export function completeOnboarding(
  level: OnboardingLevel,
  userId?: number | string | null
): void {
  try {
    localStorage.setItem(levelKey(userId), level);
    localStorage.setItem(completedKey(userId), 'true');
  } catch {
    // Silently ignore — ne bloque pas la navigation
  }
}

/**
 * Permet de modifier le niveau plus tard (ex: depuis le profil) sans
 * réinitialiser l'état "onboarding completed".
 */
export function setOnboardingLevel(
  level: OnboardingLevel,
  userId?: number | string | null
): void {
  try {
    localStorage.setItem(levelKey(userId), level);
  } catch {
    // Silently ignore
  }
}

/**
 * [VULN-30] Nettoyage systématique au logout.
 * Appelé par AuthContext avant de perdre l'userId.
 */
export function resetOnboarding(userId?: number | string | null): void {
  try {
    localStorage.removeItem(levelKey(userId));
    localStorage.removeItem(completedKey(userId));
    // Nettoyage de la clé générique (sans userId) au cas où
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_level');
  } catch {
    // Silently ignore
  }
}