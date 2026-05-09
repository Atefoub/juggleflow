import { act, render, screen } from '@testing-library/react';
import { beforeAll, vi } from 'vitest';

import App from './app';

// Précharge la page login (lazy dans AppRouter) pour éviter que Suspense reste sur le fallback en test.
beforeAll(async () => {
  await import('../pages/LoginPage');
});

// AuthProvider tente un refresh silencieux au montage.
// En test, on mock l'API pour éviter les appels réseau.
vi.mock('../api/authApi', () => {
  return {
    api: {
      post: vi.fn().mockRejectedValue(new Error('refresh disabled in tests')),
    },
    authApi: {
      me: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    },
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
    getAccessToken: vi.fn().mockReturnValue(null),
  };
});

describe('App', () => {
  it('should render successfully', async () => {
    let baseElement: HTMLElement | null = null;
    await act(async () => {
      ({ baseElement } = render(<App />));
    });
    expect(baseElement).toBeTruthy();
  });

  it('should show the login screen by default', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(await screen.findByAltText('JuggleFlow')).toBeTruthy();
  });
});
