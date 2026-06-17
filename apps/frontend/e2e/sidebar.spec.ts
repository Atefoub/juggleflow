import { test, expect } from '@playwright/test';
import { loginAsTeacher } from './helpers/auth';

test.describe('sidebar', () => {
  test('should display sidebar', async ({ page }) => {
    await loginAsTeacher(page);

    await expect(
      page.getByRole('navigation', { name: 'Navigation enseignant' }),
    ).toBeVisible();
  });
});
