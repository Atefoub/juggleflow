import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const SYNC_SUCCESS_MS = 5000;

export default function SyncStatusBanner() {
  const { user, offlineSync } = useAuth();
  const isOnline = useOnlineStatus();
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!offlineSync.lastSyncAt) return;
    setTick(Date.now());
    const id = window.setTimeout(() => setTick(Date.now()), SYNC_SUCCESS_MS);
    return () => window.clearTimeout(id);
  }, [offlineSync.lastSyncAt]);

  if (!user?.id) return null;

  const recentSuccess =
    offlineSync.lastSyncAt != null &&
    tick - new Date(offlineSync.lastSyncAt).getTime() < SYNC_SUCCESS_MS;

  // Rien à afficher si aucun pending et aucun message.
  if (
    offlineSync.pendingCount === 0 &&
    !offlineSync.isSyncing &&
    !offlineSync.lastError &&
    !recentSuccess
  ) return null;

  const tone =
    offlineSync.lastError ? 'border-alert text-alert bg-alert-surface' :
    recentSuccess && offlineSync.pendingCount === 0 ? 'border-success/30 text-success bg-success/10' :
    offlineSync.isSyncing ? 'border-border text-text-secondary bg-bg-card' :
    !isOnline ? 'border-brand/35 bg-accent-surface text-brand-end' :
    'border-success/30 text-success bg-success/10';

  const message =
    offlineSync.lastError
      ? offlineSync.lastError
      : recentSuccess && offlineSync.pendingCount === 0
        ? 'Progression synchronisée avec le serveur.'
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

