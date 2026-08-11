import { test, expect } from '@playwright/test';
import { loginAsTeacher } from './helpers/auth';

test.describe('sidebar', () => {
  test('should display sidebar', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile',
      'Sidebar fixe visible à partir de md (tablette / desktop)',
    );

    await loginAsTeacher(page);

    await expect(
      page.getByRole('navigation', { name: 'Navigation enseignant' }),
    ).toBeVisible();
  });
});
