import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminAuditEvent } from '../../api/adminApi';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

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
      setError('Impossible de charger le journal d\u2019audit.');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <AdminPageHeader
        title="Journal d'audit"
        description="Actions sensibles (comptes, classes, consentements RGPD) enregistrées côté serveur."
        actions={
          <button
            type="button"
            onClick={() => load()}
            disabled={isLoading}
            className="jf-admin-btn-secondary"
          >
            {isLoading ? '…' : 'Actualiser'}
          </button>
        }
      />

      {isLoading && (
        <p className="text-sm text-[var(--color-admin-text-muted)] text-center py-8">Chargement…</p>
      )}

      {!isLoading && error && (
        <p className="text-sm text-[var(--color-admin-danger)] text-center py-4">{error}</p>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <div className="jf-admin-card p-8 text-center">
          <p className="text-sm text-[var(--color-admin-text-muted)]">
            Aucun événement pour l&apos;instant.
          </p>
          <p className="text-xs text-[var(--color-admin-text-muted)] mt-2">
            Les prochaines actions admin apparaîtront ici.
          </p>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="jf-admin-card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[140px_1fr_220px] gap-4 px-4 py-2.5 bg-[var(--color-admin-bg)] border-b border-[var(--color-admin-border)]">
            <span className="jf-admin-section-title">Date</span>
            <span className="jf-admin-section-title">Action</span>
            <span className="jf-admin-section-title">Acteur</span>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className={`px-4 py-3 text-sm ${i < rows.length - 1 ? 'border-b border-[var(--color-admin-border)]' : ''}`}
              >
                {/* Desktop : table */}
                <div className="hidden sm:grid grid-cols-[140px_1fr_220px] gap-4 items-start">
                  <time
                    className="text-xs text-[var(--color-admin-text-muted)] font-mono"
                    dateTime={r.occurredAt}
                  >
                    {formatWhen(r.occurredAt)}
                  </time>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-admin-text)]">{r.action}</p>
                    {r.details && (
                      <p className="text-xs text-[var(--color-admin-text-secondary)] mt-1 font-mono break-all">
                        {r.details}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-admin-text-secondary)] break-all">
                    {r.actorEmail}
                  </p>
                </div>

                {/* Mobile : empilé */}
                <div className="sm:hidden">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <time
                      className="text-xs text-[var(--color-admin-text-muted)] font-mono shrink-0"
                      dateTime={r.occurredAt}
                    >
                      {formatWhen(r.occurredAt)}
                    </time>
                    <span className="font-semibold text-[var(--color-admin-text)]">
                      {r.action}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-admin-text-muted)] mt-1 break-all">
                    {r.actorEmail}
                  </p>
                  {r.details && (
                    <p className="text-xs text-[var(--color-admin-text-secondary)] mt-1 font-mono break-all">
                      {r.details}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
