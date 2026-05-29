import { test, expect } from '@playwright/test';
import { backendUrl } from './helpers/auth';

/**
 * Exécuté en dernier (préfixe z-). IP isolée via X-Forwarded-For (CI : APP_TRUSTED_PROXY=true)
 * pour ne pas partager le quota avec les logins UI des autres specs.
 */
const RATE_LIMIT_TEST_IP = '203.0.113.77';

/** CI élève le plafond auth (80) ; il faut dépasser ce quota sur l’IP de test isolée. */
const PROBE_ATTEMPTS = Number(process.env.E2E_RATE_LIMIT_PROBE_ATTEMPTS ?? 15);

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
