import { test, expect } from '@playwright/test';
import { E2E_PASSWORD, TEACHER_EMAIL, loginViaUi } from './helpers/auth';

test.describe('Smoke E2E', () => {
  test('connexion enseignant → tableau de bord', async ({ page }) => {
    await loginViaUi(page, TEACHER_EMAIL, E2E_PASSWORD);

    await expect(page).toHaveURL(/\/teacher\/dashboard/);
    await expect(page.getByText('Progression moyenne')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible();
  });
});
