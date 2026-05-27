import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingPage from './OnboardingPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const loginMock = vi.fn(async () => ({
  id: 1,
  role: 'ROLE_ELEVE',
  onboardingCompleted: true,
  jugglingLevel: 'EXPERT',
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'ROLE_ELEVE' },
    login: loginMock,
  }),
}));

const completeMock = vi.fn();

vi.mock('../../api/studentOnboardingApi', () => ({
  studentOnboardingApi: {
    complete: (...args: unknown[]) => completeMock(...args),
  },
}));

vi.mock('../../api/authApi', () => ({
  getAccessToken: () => 'token',
}));

describe('OnboardingPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    completeMock.mockReset();
    loginMock.mockClear();
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  it('renders the 4 levels including Expert', () => {
    render(<OnboardingPage />);

    expect(screen.getByText('Débutant')).toBeTruthy();
    expect(screen.getByText('Intermédiaire')).toBeTruthy();
    expect(screen.getByText('Avancé')).toBeTruthy();
    expect(screen.getByText('Expert')).toBeTruthy();
  });

  it('submits EXPERT and navigates to dashboard', async () => {
    completeMock.mockResolvedValue({
      id: 1,
      role: 'ROLE_ELEVE',
      onboardingCompleted: true,
      jugglingLevel: 'EXPERT',
    });

    const user = userEvent.setup();
    render(<OnboardingPage />);

    await user.click(screen.getByText('Expert'));
    await user.click(screen.getByRole('button', { name: "C'est parti →" }));

    expect(completeMock).toHaveBeenCalledWith('EXPERT');
    expect(navigateMock).toHaveBeenCalledWith('/student/dashboard', { replace: true });
  });
});

