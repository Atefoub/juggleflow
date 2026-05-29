import { expect, type Page } from '@playwright/test';

/** Comptes créés par DemoBootstrapRunner + AdminBootstrapRunner (docker-compose / CI). */
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'Demo2026!';
export const E2E_ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'Admin2026!';

export const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL ?? 'marie.dupont@ecole.fr';
export const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL ?? 'lucas.martin@ecole.fr';
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@juggleflow.local';

const BACKEND_BASE = (process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8080').replace(
  /\/$/,
  '',
);

export function backendUrl(path: string): string {
  return `${BACKEND_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Connexion UI standard (formulaire /login). */
export async function loginViaUi(
  page: Page,
  email: string,
  password: string = E2E_PASSWORD,
): Promise<void> {
  await page.goto('/login');
  await expect(page.getByText('Plateforme pédagogique de jonglage')).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  const loginResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/api/auth/login') && res.request().method() === 'POST',
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: /Se connecter/i }).click();
  const response = await loginResponse;

  if (response.status() !== 200) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `POST /api/auth/login → ${response.status()}${body ? `: ${body}` : ''}`,
    );
  }

  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 });
}

/** Complète l'onboarding élève si la page s'affiche (données démo déjà onboardées en général). */
export async function completeStudentOnboardingIfNeeded(page: Page): Promise<void> {
  if (!page.url().includes('/onboarding')) return;

  await expect(page.getByText('Bienvenue sur JuggleFlow !')).toBeVisible();
  await page.getByRole('button', { name: /C'est parti/i }).click();
  await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 20_000 });
}

export async function expectOnLoginPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Plateforme pédagogique de jonglage')).toBeVisible();
}

/** Connexion enseignant puis attente du tableau de bord. */
export async function loginAsTeacher(page: Page): Promise<void> {
  await loginViaUi(page, TEACHER_EMAIL, E2E_PASSWORD);
  await expect(page).toHaveURL(/\/teacher\/dashboard/);
  await expect(page.getByText('Progression moyenne')).toBeVisible();
}
