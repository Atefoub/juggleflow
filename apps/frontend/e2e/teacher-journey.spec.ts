import { test, expect } from '@playwright/test';
import { loginAsTeacher } from './helpers/auth';

const OPTIONAL_ASSIGN_PATH = 'Foulards — Initiation';

test.describe('Parcours enseignant', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('tableau de bord : alerte élève bloqué sur une figure (données démo)', async ({
    page,
  }) => {
    const blockageAlert = page
      .locator('div.bg-accent-surface')
      .filter({ hasText: /bloqué sur une figure/i });
    await expect(blockageAlert).toBeVisible();
    await expect(blockageAlert.getByText('Lucas M. (Fontaine)')).toBeVisible();

    await blockageAlert.getByRole('button', { name: /Voir les élèves/i }).click();
    await expect(page).toHaveURL(/\/teacher\/eleves/);
    await expect(page.getByText(/Bloqué/i).first()).toBeVisible();
  });

  test('export CSV de progression pour un parcours assigné', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Parcours assignés' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Générer rapport' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/progress_class_\d+_path_\d+\.csv/);
  });

  test('assignation d’un parcours à la classe (assistant 3 étapes)', async ({ page }) => {
    const alreadyAssigned = await page
      .getByRole('heading', { name: 'Parcours assignés' })
      .locator('..')
      .getByText(OPTIONAL_ASSIGN_PATH)
      .isVisible()
      .catch(() => false);

    if (alreadyAssigned) {
      await expect(page.getByText(OPTIONAL_ASSIGN_PATH)).toBeVisible();
      return;
    }

    await page
      .getByRole('button', { name: '+ Assigner', exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/teacher\/parcours\/assigner/);
    await expect(page.getByRole('heading', { name: 'Assigner un parcours' })).toBeVisible();

    await page.getByRole('button', { name: OPTIONAL_ASSIGN_PATH }).click();
    await page.getByRole('button', { name: 'Continuer →' }).click();
    await expect(page.getByText('Étape 2 — Choisir la cible')).toBeVisible();

    await page.getByRole('button', { name: 'Continuer →' }).click();
    await expect(page.getByText('Étape 3 — Confirmation')).toBeVisible();

    await page.getByRole('button', { name: /Valider l'assignation/i }).click();
    await expect(page.getByText(/Parcours assigné avec succès/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 20_000 });
    await expect(page.getByText(OPTIONAL_ASSIGN_PATH)).toBeVisible();
  });
});
