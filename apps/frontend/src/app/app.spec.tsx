import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import App from './app';

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
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should show the login screen by default', () => {
    render(<App />);
    expect(screen.getByAltText('JuggleFlow')).toBeTruthy();
  });
});
