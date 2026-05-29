import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

function ThrowOnce({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('render failure');
  }
  return <p>Contenu OK</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('affiche le fallback quand un enfant plante au rendu', () => {
    render(
      <ErrorBoundary>
        <ThrowOnce shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Une erreur est survenue')).toBeTruthy();
    expect(screen.queryByText('Contenu OK')).toBeNull();
  });

  it('remonte les enfants après « Réessayer » si l’erreur ne se reproduit plus', async () => {
    const user = userEvent.setup();
    let throwNext = true;

    function MaybeThrow() {
      if (throwNext) {
        throw new Error('boom');
      }
      return <p>Contenu OK</p>;
    }

    render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Une erreur est survenue')).toBeTruthy();

    throwNext = false;
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByText('Contenu OK')).toBeTruthy();
    expect(screen.queryByText('Une erreur est survenue')).toBeNull();
  });
});
