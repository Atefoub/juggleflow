import { test, expect } from '@playwright/test';
import {
  E2E_PASSWORD,
  STUDENT_EMAIL,
  completeStudentOnboardingIfNeeded,
  loginAsTeacher,
  loginViaUi,
} from './helpers/auth';

const hasHorizontalOverflow = () =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth;

test.describe('responsive — absence de débordement horizontal', () => {
  test('espace élève', async ({ page }) => {
    await loginViaUi(page, STUDENT_EMAIL, E2E_PASSWORD);
    await completeStudentOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/student\//);

    const overflow = await page.evaluate(hasHorizontalOverflow);
    expect(overflow).toBe(false);
  });

  test('espace enseignant', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page).toHaveURL(/\/teacher\/dashboard/);

    const overflow = await page.evaluate(hasHorizontalOverflow);
    expect(overflow).toBe(false);
  });
});
