export type OnboardingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

function completedKey(userId?: number | string | null) {
  return userId ? `onboarding_completed:${userId}` : 'onboarding_completed';
}

function levelKey(userId?: number | string | null) {
  return userId ? `onboarding_level:${userId}` : 'onboarding_level';
}

export function isOnboardingCompleted(userId?: number | string | null): boolean {
  return localStorage.getItem(completedKey(userId)) === 'true';
}

export function getOnboardingLevel(userId?: number | string | null): OnboardingLevel | null {
  const v = localStorage.getItem(levelKey(userId));
  if (v === 'BEGINNER' || v === 'INTERMEDIATE' || v === 'ADVANCED') return v;
  return null;
}

export function completeOnboarding(level: OnboardingLevel, userId?: number | string | null) {
  localStorage.setItem(levelKey(userId), level);
  localStorage.setItem(completedKey(userId), 'true');
}

export function resetOnboarding(userId?: number | string | null) {
  localStorage.removeItem(levelKey(userId));
  localStorage.removeItem(completedKey(userId));
}
