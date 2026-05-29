import { test, expect } from '@playwright/test';
import {
  E2E_PASSWORD,
  STUDENT_EMAIL,
  loginViaUi,
  completeStudentOnboardingIfNeeded,
} from './helpers/auth';

test.describe('Parcours élève', () => {
  test('connexion élève → tableau de bord', async ({ page }) => {
    await loginViaUi(page, STUDENT_EMAIL, E2E_PASSWORD);

    await completeStudentOnboardingIfNeeded(page);

    await expect(page).toHaveURL(/\/student\/dashboard/);
    await expect(page.getByText('Bonjour')).toBeVisible();
    await expect(page.getByText('Défi du jour')).toBeVisible();
    await expect(page.getByText('Parcours en cours')).toBeVisible();
  });
});
