import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  resetKey: number;
}

/**
 * Évite un écran blanc si un composant enfant plante au rendu.
 * « Réessayer » remonte l'arbre ; « Recharger » force un rechargement complet.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState((s) => ({
      hasError: false,
      resetKey: s.resetKey + 1,
    }));
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-bg-primary font-body px-6"
          role="alert"
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-bg-card border border-border text-center">
            <h1 className="font-display text-xl font-bold text-text-primary mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              L&apos;application a rencontré un problème inattendu. Vous pouvez
              réessayer ou recharger la page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 rounded-xl bg-accent text-white font-medium hover:opacity-90"
              >
                Réessayer
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl border border-border text-text-primary font-medium hover:bg-bg-secondary"
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
