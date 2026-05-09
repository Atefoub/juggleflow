import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function SyncStatusBanner() {
  const { user, offlineSync } = useAuth();
  const isOnline = useOnlineStatus();

  if (!user?.id) return null;

  // Rien à afficher si aucun pending et aucun message.
  if (
    offlineSync.pendingCount === 0 &&
    !offlineSync.isSyncing &&
    !offlineSync.lastError
  ) return null;

  const tone =
    offlineSync.lastError ? 'border-alert text-alert bg-[#2A1020]' :
    offlineSync.isSyncing ? 'border-border text-text-secondary bg-bg-card' :
    !isOnline ? 'border-brand/35 bg-[#1A1028] text-brand-end' :
    'border-success/30 text-success bg-success/10';

  const message =
    offlineSync.lastError
      ? offlineSync.lastError
      : offlineSync.isSyncing
        ? `Synchronisation en cours… (${offlineSync.pendingCount})`
        : !isOnline
          ? `Hors connexion — ${offlineSync.pendingCount} mise(s) à jour en attente`
          : offlineSync.pendingCount > 0
            ? `Synchronisation en attente… (${offlineSync.pendingCount})`
            : 'Synchronisation terminée.';

  return (
    <div className={`mx-auto max-w-107.5 px-5 pt-3`}>
      <div className={`p-3 rounded-2xl border ${tone}`}>
        <p className="text-xs font-semibold">{message}</p>
      </div>
    </div>
  );
}

