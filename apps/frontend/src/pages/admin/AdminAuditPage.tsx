import BottomNav from '../../components/BottomNav';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminAuditEvent } from '../../api/adminApi';

const navItems = [
  { label: 'Utilisateurs', icon: '👥', path: '/admin/users' },
  { label: 'Classes',      icon: '🏫', path: '/admin/classes' },
  { label: 'RGPD',         icon: '🔒', path: '/admin/rgpd' },
  { label: 'Journal',      icon: '📋', path: '/admin/audit' },
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AdminAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminApi.listAuditEvents(200);
      setRows(data);
    } catch {
      setError('Impossible de charger le journal d’audit.');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-24">

      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-1">Journal d&apos;audit</h1>
        <p className="text-xs text-text-muted">
          Actions sensibles (comptes, classes, consentements RGPD) enregistrées côté serveur.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => load()}
            disabled={isLoading}
            className="jf-btn-secondary jf-btn-secondary-sm disabled:opacity-50"
          >
            Actualiser
          </button>
        </div>

        {isLoading && (
          <p className="text-sm text-text-muted text-center py-8">Chargement…</p>
        )}

        {!isLoading && error && (
          <p className="text-sm text-alert text-center py-4">{error}</p>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">
            Aucun événement pour l’instant. Les prochaines actions admin apparaîtront ici.
          </p>
        )}

        {!isLoading && rows.length > 0 && (
          <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto] gap-2 px-3 py-2 bg-bg-primary border-b border-border text-[0.65rem] font-bold text-text-muted uppercase tracking-wide">
              <span>Date</span>
              <span>Action</span>
              <span className="hidden sm:block">Acteur</span>
            </div>
            <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {rows.map((r) => (
                <li key={r.id} className="px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <time className="text-xs text-text-muted shrink-0" dateTime={r.occurredAt}>
                      {formatWhen(r.occurredAt)}
                    </time>
                    <span className="font-semibold text-text-primary">{r.action}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1 break-all">{r.actorEmail}</p>
                  {r.details && (
                    <p className="text-xs text-text-secondary mt-1 font-mono break-all">{r.details}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
