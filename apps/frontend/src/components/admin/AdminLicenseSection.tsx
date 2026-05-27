import { useEffect, useState } from 'react';
import { adminApi, type AdminLicenseSettings } from '../../api/adminApi';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

interface AdminLicenseSectionProps {
  onUpdated?: () => void;
}

export default function AdminLicenseSection({ onUpdated }: AdminLicenseSectionProps) {
  const [license, setLicense] = useState<AdminLicenseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [seatCap, setSeatCap] = useState('');
  const [noExpiration, setNoExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getLicenseSettings();
      setLicense(data);
      setSeatCap(String(data.licenseSeatCap));
      setNoExpiration(data.licenseExpiresAt == null);
      setExpiresAt(data.licenseExpiresAt ?? '');
    } catch {
      setError('Impossible de charger les paramètres de licence.');
      setLicense(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    const cap = Number.parseInt(seatCap, 10);
    if (!Number.isFinite(cap) || cap < 1) {
      setError('Indique un plafond valide (nombre entier ≥ 1).');
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminApi.updateLicenseSettings({
        licenseSeatCap: cap,
        licenseExpiresAt: noExpiration ? null : expiresAt || null,
      });
      setLicense(updated);
      setSeatCap(String(updated.licenseSeatCap));
      setNoExpiration(updated.licenseExpiresAt == null);
      setExpiresAt(updated.licenseExpiresAt ?? '');
      setSuccess('Licence mise à jour.');
      onUpdated?.();
    } catch (err) {
      setError(apiErrorMessage(err, 'Mise à jour de la licence impossible.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-xs text-[var(--color-admin-text-muted)] py-2">Chargement de la licence…</p>
    );
  }

  if (!license) {
    return error ? (
      <p className="text-xs text-[var(--color-admin-danger)]">{error}</p>
    ) : null;
  }

  const usagePercent =
    license.licenseSeatCap > 0
      ? Math.min(100, Math.round((license.licenseUsedCount / license.licenseSeatCap) * 100))
      : 0;

  return (
    <div className="mt-4 pt-4 border-t border-[var(--color-admin-border)]">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-admin-text)]">Licence établissement</h3>
          <p className="text-xs text-[var(--color-admin-text-muted)] mt-0.5">
            {license.establishmentName} · comptes élèves et enseignants (hors administrateurs)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {license.licenseExpired && (
            <span className="jf-admin-chip jf-admin-chip-danger text-[0.65rem]">Expirée</span>
          )}
          {license.licenseAtCapacity && !license.licenseExpired && (
            <span className="jf-admin-chip jf-admin-chip-warning text-[0.65rem]">Plafond atteint</span>
          )}
        </div>
      </div>

      <p className="text-xs text-[var(--color-admin-text-muted)] mb-3">
        Utilisation :{' '}
        <strong className="text-[var(--color-admin-text-secondary)]">
          {license.licenseUsedCount} / {license.licenseSeatCap}
        </strong>{' '}
        ({usagePercent} %)
      </p>

      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-admin-text-muted)]">Plafond de sièges</span>
          <input
            type="number"
            min={1}
            max={10000}
            value={seatCap}
            onChange={(e) => setSeatCap(e.target.value)}
            className="jf-admin-input"
            disabled={saving}
          />
        </label>

        <div className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-admin-text-muted)]">Date d&apos;expiration</span>
          <label className="flex items-center gap-2 mb-1 text-[var(--color-admin-text-secondary)]">
            <input
              type="checkbox"
              checked={noExpiration}
              onChange={(e) => setNoExpiration(e.target.checked)}
              disabled={saving}
              className="rounded border-[var(--color-admin-border)]"
            />
            Pas de date d&apos;expiration
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={saving || noExpiration}
            className="jf-admin-input disabled:opacity-50"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-[var(--color-admin-danger)] mb-2">{error}</p>
      )}
      {success && (
        <p className="text-xs text-[var(--color-admin-success)] mb-2">{success}</p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="jf-admin-btn-primary text-xs min-h-9 px-4 disabled:opacity-60"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer la licence'}
      </button>
    </div>
  );
}
