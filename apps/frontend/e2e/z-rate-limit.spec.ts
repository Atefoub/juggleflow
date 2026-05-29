import { test, expect } from '@playwright/test';
import { backendUrl } from './helpers/auth';

/**
 * Exécuté en dernier (préfixe z-) pour limiter l'impact sur les autres scénarios
 * qui consomment aussi le quota de login (10 req/min/IP).
 */
test.describe('Rate limiting (API)', () => {
  test('login: trop de tentatives → HTTP 429', async ({ request }) => {
    const url = backendUrl('/api/auth/login');
    let saw429 = false;

    for (let i = 0; i < 15; i++) {
      const response = await request.post(url, {
        data: {
          email: 'rate-limit-e2e@ecole.fr',
          password: 'WrongPassword!',
        },
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status() === 429) {
        saw429 = true;
        const body = await response.text();
        expect(body).toMatch(/Too Many Requests|trop de tentatives/i);
        break;
      }

      expect([401, 429]).toContain(response.status());
    }

    expect(saw429).toBe(true);
  });
});
