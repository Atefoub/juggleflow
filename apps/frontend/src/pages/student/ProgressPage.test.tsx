import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProgressPage from './ProgressPage';
import { enqueueProgressUpdate } from '../../utils/offlineQueue';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, firstName: 'Léa', lastName: 'Test', role: 'ROLE_ELEVE' },
  }),
}));

vi.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

vi.mock('../../components/BottomNav', () => ({
  default: () => null,
}));

vi.mock('../../components/OfflineBanner', () => ({
  default: () => null,
}));

vi.mock('../../api/studentOffline', () => ({
  getStudentStatistics: vi.fn(async () => ({
    totalTricksLearned: 1,
    tricksInProgress: 0,
    badgesEarned: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    totalPracticeMinutes: 0,
  })),
  getStudentBadges: vi.fn(async () => ({ unlocked: [], all: [] })),
  getStudentProgress: vi.fn(async () => [
    {
      trickId: 1,
      trickName: 'Cascade',
      status: 'MASTERED',
      masteryScore: 100,
      updatedAt: '2026-06-01T10:00:00.000Z',
    },
  ]),
}));

describe('ProgressPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('se rend sans erreur avec une entrée enqueue pour un trickId absent du serveur', async () => {
    enqueueProgressUpdate(1, { trickId: 999, status: 'MASTERED' });

    render(<ProgressPage />);

    await waitFor(() => {
      expect(screen.getByText('Détail par figure')).toBeTruthy();
    });

    expect(screen.getByText('Cascade')).toBeTruthy();
    expect(screen.getByText('2 figures')).toBeTruthy();
  });
});
