import { test, expect } from '@playwright/test';

/** Comptes créés par DemoBootstrapRunner (docker-compose ou .env demo). */
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'Demo2026!';
const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL ?? 'marie.dupont@ecole.fr';

test.describe('Smoke E2E', () => {
  test('connexion enseignant → tableau de bord', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Plateforme pédagogique de jonglage')).toBeVisible();
    await page.locator('input[type="email"]').fill(TEACHER_EMAIL);
    await page.locator('input[type="password"]').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: /Se connecter/i }).click();

    await expect(page).toHaveURL(/\/teacher\/dashboard/);
    await expect(page.getByText('Progression moyenne')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible();
  });
});
