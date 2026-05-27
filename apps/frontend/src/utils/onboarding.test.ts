import { describe, expect, it } from 'vitest';
import {
  ALL_ONBOARDING_LEVELS,
  isOnboardingLevel,
  ONBOARDING_LEVEL_LABELS,
} from './onboarding';

describe('onboarding levels', () => {
  it('includes EXPERT in all onboarding levels', () => {
    expect(ALL_ONBOARDING_LEVELS).toContain('EXPERT');
    expect(ONBOARDING_LEVEL_LABELS.EXPERT).toBe('Expert');
  });

  it('recognizes EXPERT as a valid onboarding level', () => {
    expect(isOnboardingLevel('EXPERT')).toBe(true);
    expect(isOnboardingLevel('NOVICE')).toBe(false);
  });
});
