import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_PASSWORD,
  STUDENT_EMAIL,
  TEACHER_EMAIL,
  completeStudentOnboardingIfNeeded,
  expectOnLoginPage,
  loginViaUi,
} from './helpers/auth';

test.describe('Garde de rôles (routes protégées)', () => {
  test('visiteur non connecté → /student/dashboard redirige vers /login', async ({
    page,
  }) => {
    await page.goto('/student/dashboard');
    await expectOnLoginPage(page);
  });

  test('élève → /teacher/dashboard redirige vers espace élève', async ({
    page,
  }) => {
    await loginViaUi(page, STUDENT_EMAIL, E2E_PASSWORD);
    await completeStudentOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/student\/dashboard/);

    await page.goto('/teacher/dashboard');
    await expect(page).toHaveURL(/\/student\/dashboard/);
    await expect(page.getByText('Bonjour')).toBeVisible();
  });

  test('enseignant → /admin/dashboard redirige vers espace enseignant', async ({
    page,
  }) => {
    await loginViaUi(page, TEACHER_EMAIL, E2E_PASSWORD);
    await expect(page).toHaveURL(/\/teacher\/dashboard/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/teacher\/dashboard/);
    await expect(page.getByText('Progression moyenne')).toBeVisible();
  });

  test('admin → /student/dashboard redirige vers espace admin', async ({
    page,
  }) => {
    await loginViaUi(page, ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto('/student/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(
      page.getByRole('heading', { name: 'Tableau de bord' }),
    ).toBeVisible();
  });
});
