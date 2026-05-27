/** Cache local d'onboarding élève (userId uniquement) ; resetOnboarding au logout. */

import type { UserProfile } from '../types/auth';

export type OnboardingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export const ONBOARDING_LEVEL_LABELS: Record<OnboardingLevel, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  EXPERT: 'Expert',
};

export const ONBOARDING_LEVEL_OPTIONS: ReadonlyArray<{
  value: OnboardingLevel;
  label: string;
  description: string;
}> = [
  {
    value: 'BEGINNER',
    label: ONBOARDING_LEVEL_LABELS.BEGINNER,
    description: "Je n'ai jamais jonglé ou je commence tout juste",
  },
  {
    value: 'INTERMEDIATE',
    label: ONBOARDING_LEVEL_LABELS.INTERMEDIATE,
    description: 'Je maîtrise les 3 balles et quelques figures de base',
  },
  {
    value: 'ADVANCED',
    label: ONBOARDING_LEVEL_LABELS.ADVANCED,
    description: 'Je pratique régulièrement des figures complexes',
  },
  {
    value: 'EXPERT',
    label: ONBOARDING_LEVEL_LABELS.EXPERT,
    description: 'Je maîtrise des enchaînements avancés et des patterns complexes',
  },
] as const;

export const ALL_ONBOARDING_LEVELS: readonly OnboardingLevel[] =
  ONBOARDING_LEVEL_OPTIONS.map((o) => o.value);

export function isOnboardingLevel(value: string | null | undefined): value is OnboardingLevel {
  return value != null && (ALL_ONBOARDING_LEVELS as readonly string[]).includes(value);
}

/** Profil serveur prioritaire, localStorage en secours (offline / migration). */
export function isStudentOnboardingDone(
  user: Pick<UserProfile, 'id' | 'onboardingCompleted'> | null | undefined,
): boolean {
  if (!user?.id) return false;
  if (user.onboardingCompleted === true) return true;
  return isOnboardingCompleted(user.id);
}

/** Aligne le cache local avec le profil API après login ou /me. */
export function applyProfileOnboarding(profile: UserProfile): void {
  if (profile.role !== 'ROLE_ELEVE' || profile.id == null) return;
  if (profile.jugglingLevel) {
    try {
      localStorage.setItem(levelKey(profile.id), profile.jugglingLevel);
    } catch {
      // ignore
    }
  }
  if (profile.onboardingCompleted) {
    try {
      localStorage.setItem(completedKey(profile.id), 'true');
    } catch {
      // ignore
    }
  }
}

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
    if (isOnboardingLevel(v)) return v;
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

/** Nettoie le cache local d'onboarding (appelé par AuthContext.logout). */
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