import { useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={['p-4 bg-bg-card rounded-2xl border border-border', className].join(' ')}>
      {children}
    </div>
  );
}

export default function PwaInstallPrompt({ className = '' }: { className?: string }) {
  const { canInstall, showIosHint, showAndroidHint, isInstalled, install } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return (
      <Card className={className}>
        <p className="text-xs text-text-muted">Application installée sur cet appareil.</p>
      </Card>
    );
  }

  if (canInstall) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Installer l&apos;application</p>
            <p className="text-xs text-text-muted mt-0.5">
              Accès rapide depuis l&apos;écran d&apos;accueil, avec contenu hors-ligne préchargé.
            </p>
          </div>
          <button
            type="button"
            disabled={installing}
            onClick={async () => {
              setInstalling(true);
              try {
                await install();
              } finally {
                setInstalling(false);
              }
            }}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-linear-to-br from-brand to-brand-end hover:opacity-90 transition-opacity disabled:opacity-60 min-h-11"
          >
            {installing ? '…' : 'Installer'}
          </button>
        </div>
      </Card>
    );
  }

  if (showAndroidHint) {
    return (
      <Card className={className}>
        <p className="text-sm font-semibold text-text-primary">Installer sur Android</p>
        <ol className="mt-2 space-y-1.5 text-xs text-text-muted list-decimal list-inside">
          <li>Menu Chrome (⋮) → « Installer l&apos;application »</li>
          <li>Confirme — l&apos;icône JuggleFlow apparaît sur l&apos;écran d&apos;accueil</li>
        </ol>
      </Card>
    );
  }

  if (showIosHint) {
    return (
      <Card className={className}>
        <p className="text-sm font-semibold text-text-primary">Installer sur iPhone / iPad</p>
        <p className="text-xs text-text-muted mt-1">
          Safari → Partager → « Sur l&apos;écran d&apos;accueil ».
        </p>
      </Card>
    );
  }

  return null;
}
