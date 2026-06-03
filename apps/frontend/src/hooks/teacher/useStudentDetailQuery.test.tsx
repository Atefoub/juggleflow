import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useStudentDetailQuery, STUDENT_NOT_FOUND_ERROR } from './useStudentDetailQuery';
import { classesApi } from '../../api/teacher/classesApi';
import { studentsApi } from '../../api/teacher/studentsApi';

vi.mock('../../api/teacher/classesApi', () => ({
  classesApi: {
    getClassStudents: vi.fn(),
  },
}));

vi.mock('../../api/teacher/pathsApi', () => ({
  pathsApi: {
    getAssignedPathsForStudent: vi.fn().mockResolvedValue([]),
    getEffectiveAssignmentForStudent: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../api/teacher/studentsApi', () => ({
  studentsApi: {
    getStudentClassContext: vi.fn(),
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useStudentDetailQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('utilise getStudentClassContext sans classId dans l’URL', async () => {
    vi.mocked(studentsApi.getStudentClassContext).mockResolvedValue({
      classId: 2,
      className: 'CE2',
      student: {
        id: 10,
        firstName: 'A',
        lastName: 'B',
        progressionPercent: 50,
        lastActivityAt: null,
        groupColor: 'VERT',
        groupColorAuto: 'VERT',
        groupColorManual: false,
        blocked: false,
        blockedTrickId: null,
        blockedTrickName: null,
        blockedAttemptCount: null,
      },
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useStudentDetailQuery(10, null),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(result.current.student?.id).toBe(10));
    expect(studentsApi.getStudentClassContext).toHaveBeenCalledWith(10);
    expect(classesApi.getClassStudents).not.toHaveBeenCalled();
  });

  it('signale élève introuvable quand classId fourni mais absent de la liste', async () => {
    vi.mocked(classesApi.getClassStudents).mockResolvedValue([]);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useStudentDetailQuery(99, 1),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(result.current.error).toBe(STUDENT_NOT_FOUND_ERROR));
  });
});
