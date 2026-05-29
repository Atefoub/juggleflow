import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  loginViaUi,
} from './helpers/auth';

test.describe('Admin RGPD', () => {
  test('connexion admin → page consentements RGPD', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

    await page.getByRole('link', { name: 'RGPD' }).click();
    await expect(page).toHaveURL(/\/admin\/rgpd/);
    await expect(page.getByRole('heading', { name: /RGPD/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Consentements parentaux' }),
    ).toBeVisible();
  });
});
