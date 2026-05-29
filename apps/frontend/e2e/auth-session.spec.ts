import { test, expect } from '@playwright/test';
import {
  E2E_PASSWORD,
  TEACHER_EMAIL,
  loginViaUi,
  expectOnLoginPage,
} from './helpers/auth';

test.describe('Auth session (refresh cookie + logout)', () => {
  test('refresh: rechargement de page conserve la session enseignant', async ({ page }) => {
    await loginViaUi(page, TEACHER_EMAIL, E2E_PASSWORD);
    await expect(page).toHaveURL(/\/teacher\/dashboard/);
    await expect(page.getByText('Progression moyenne')).toBeVisible();

    const refreshResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/auth/refresh') &&
        res.request().method() === 'POST' &&
        res.ok(),
      { timeout: 20_000 },
    );
    await page.reload();
    await refreshResponse;
    await expect(page).toHaveURL(/\/teacher\/dashboard/);
    await expect(page.getByText('Progression moyenne')).toBeVisible();
  });

  test('logout: déconnexion puis accès protégé refusé', async ({ page }) => {
    await loginViaUi(page, TEACHER_EMAIL, E2E_PASSWORD);
    await expect(page).toHaveURL(/\/teacher\/dashboard/);

    await page.getByRole('button', { name: 'Quitter' }).click();
    await expectOnLoginPage(page);

    await page.goto('/teacher/dashboard');
    await expectOnLoginPage(page);
  });
});
