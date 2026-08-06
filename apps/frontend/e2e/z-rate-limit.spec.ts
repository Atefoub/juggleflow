import { test, expect } from '@playwright/test';
import { backendUrl } from './helpers/auth';

/**
 * Exécuté en dernier (préfixe z-). IP isolée via X-Forwarded-For (CI : APP_TRUSTED_PROXY=true)
 * pour ne pas partager le quota avec les logins/refresh UI (127.0.0.1).
 *
 * Ne jamais baisser APP_RATE_LIMIT_MAX_REQUESTS pour « aider » ce test : cela sature
 * le bucket partagé par Playwright et casse student/teacher journeys (HTTP 429).
 */
const RATE_LIMIT_TEST_IP = '203.0.113.77';

/**
 * Défaut local ~25 (max-requests=10). En CI : E2E_RATE_LIMIT_PROBE_ATTEMPTS ≈ 2× MAX_REQUESTS
 * pour compenser le refill greedy Bucket4j pendant la boucle.
 */
const PROBE_ATTEMPTS = Number(process.env.E2E_RATE_LIMIT_PROBE_ATTEMPTS ?? 25);

test.describe('Rate limiting (API)', () => {
  test('login: trop de tentatives → HTTP 429', async ({ request }) => {
    const url = backendUrl('/api/auth/login');
    let saw429 = false;

    for (let i = 0; i < PROBE_ATTEMPTS; i++) {
      const response = await request.post(url, {
        data: {
          email: 'rate-limit-e2e@ecole.fr',
          password: 'WrongPassword!',
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': RATE_LIMIT_TEST_IP,
        },
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
