import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi, type AdminSchoolClass } from '../../api/adminApi';
import { adminGdprApi, type ConsentStatusRow } from '../../api/adminGdprApi';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
}

function toConsentCsv(rows: ConsentStatusRow[]): string {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const header = [
    'userId',
    'firstName',
    'lastName',
    'hasParentalConsent',
    'consentDate',
    'policyVersion',
  ].join(',');

  const body = rows.map((r) => ([
    String(r.userId),
    esc(r.firstName ?? ''),
    esc(r.lastName ?? ''),
    String(r.hasParentalConsent),
    esc(r.consentDate ?? ''),
    esc(r.policyVersion ?? ''),
  ].join(','))).join('\n');

  return `${header}\n${body}\n`;
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminRgpdPage() {
  const { user } = useAuth();
  const [policyVersion, setPolicyVersion] = useState('2026-1');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<AdminSchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<number | null>(null);

  const [rows, setRows] = useState<ConsentStatusRow[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadClasses = async () => {
      try {
        const data = await adminApi.getClasses();
        if (cancelled) return;
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
        if (data.length > 0) setSelectedSchoolYear(data[0].schoolYear);
      } catch {
        if (!cancelled) setError('Impossible de charger la liste des classes.');
      }
    };

    loadClasses();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedClassId == null) return;
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [status, pending] = await Promise.all([
          adminGdprApi.getClassConsentStatus(selectedClassId),
          adminGdprApi.getPendingCount(selectedClassId),
        ]);
        if (cancelled) return;
        setRows(status);
        setPendingCount(pending);
      } catch {
        if (!cancelled) setError('Impossible de charger les consentements RGPD.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedClassId]);

  const consentStats = useMemo(() => {
    const accordes = rows.filter((r) => r.status === 'VALID').length;
    const expires  = rows.filter((r) => r.status === 'EXPIRED').length;
    const manquants = rows.filter(
      (r) => r.status === 'MISSING' || r.status === 'REVOKED'
    ).length;
    return { accordes, manquants, expires };
  }, [rows]);

  const total = consentStats.accordes + consentStats.manquants + consentStats.expires;
  const progressValue = total === 0 ? 0 : Math.round((consentStats.accordes / total) * 100);

  // Les consentements expirés sont aussi à relancer côté DPO : on les groupe avec les manquants.
  const missingRows = useMemo(
    () => rows.filter((r) => r.status !== 'VALID'),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === '') return rows;
    return rows.filter((r) =>
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const availableSchoolYears = useMemo(() => {
    const years = Array.from(new Set(classes.map((c) => c.schoolYear)));
    years.sort((a, b) => b - a);
    return years;
  }, [classes]);

  async function refreshConsentRows() {
    if (selectedClassId == null) return;
    const [status, pending] = await Promise.all([
      adminGdprApi.getClassConsentStatus(selectedClassId),
      adminGdprApi.getPendingCount(selectedClassId),
    ]);
    setRows(status);
    setPendingCount(pending);
  }

  async function recordParentalConsentRow(userId: number) {
    if (!user?.id || selectedClassId == null) return;
    setBusyUserId(userId);
    setError(null);
    try {
      await adminGdprApi.recordConsent({
        userId,
        consentGiven: true,
        policyVersion: policyVersion.trim() || '2026-1',
        legalGuardianId: user.id,
      });
      await adminApi.setUserEnabled(userId, true);
      await refreshConsentRows();
    } catch {
      setError('Impossible d\u2019enregistrer le consentement.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function revokeParentalForUser(userId: number) {
    if (selectedClassId == null) return;
    if (!window.confirm('Révoquer le consentement parental ? Le compte élève sera désactivé.')) return;
    setBusyUserId(userId);
    setError(null);
    try {
      await adminGdprApi.revokeParentalConsent(userId);
      await refreshConsentRows();
    } catch {
      setError('Impossible de révoquer le consentement.');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="RGPD &amp; Export"
        description="Suivi des consentements parentaux, exports CSV (progression, registre)."
      />

      {/* Sélecteur de classe */}
      <section className="jf-admin-card p-4 mb-4">
        <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="rgpd-class">
          Classe
        </label>
        <select
          id="rgpd-class"
          className="jf-admin-input"
          value={selectedClassId ?? ''}
          onChange={(e) => setSelectedClassId(Number(e.target.value))}
          disabled={classes.length === 0}
        >
          {classes.length === 0 && (
            <option value="">Aucune classe</option>
          )}
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.schoolYear})
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-[var(--color-admin-danger)] mt-2">{error}</p>
        )}
      </section>

      {/* Consentements */}
      <section className="mb-6">
        <h2 className="jf-admin-section-title mb-3">Consentements parentaux</h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg border bg-[var(--color-admin-success-bg)] border-[color-mix(in_srgb,var(--color-admin-success)_25%,transparent)] flex flex-col items-center gap-1">
            <span className="font-display text-3xl font-bold text-[var(--color-admin-success)]">
              {consentStats.accordes}
            </span>
            <span className="text-xs text-[var(--color-admin-success)] font-semibold">Accordés</span>
          </div>
          <div className="p-3 rounded-lg border bg-[var(--color-admin-danger-bg)] border-[color-mix(in_srgb,var(--color-admin-danger)_25%,transparent)] flex flex-col items-center gap-1">
            <span className="font-display text-3xl font-bold text-[var(--color-admin-danger)]">
              {consentStats.manquants}
            </span>
            <span className="text-xs text-[var(--color-admin-danger)] font-semibold">Manquants</span>
          </div>
          <div className="p-3 rounded-lg border bg-[var(--color-admin-warning-bg)] border-[color-mix(in_srgb,var(--color-admin-warning)_25%,transparent)] flex flex-col items-center gap-1">
            <span className="font-display text-3xl font-bold text-[var(--color-admin-warning)]">
              {consentStats.expires}
            </span>
            <span className="text-xs text-[var(--color-admin-warning)] font-semibold">Expirés</span>
          </div>
        </div>

        <div
          className="w-full h-2 rounded-full bg-[var(--color-admin-border)] overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressValue}
        >
          <div
            className="h-full bg-[var(--color-admin-success)] transition-[width] duration-200"
            style={{ width: `${progressValue}%` }}
          />
        </div>
        <p className="text-xs text-[var(--color-admin-text-muted)] mt-1">
          {consentStats.accordes} / {total} consentements accordés
          {consentStats.expires > 0 && (
            <> · <span className="text-[var(--color-admin-warning)] font-semibold">
              {consentStats.expires} à renouveler
            </span></>
          )}
          {selectedClassId != null && (
            <> · {pendingCount} en attente</>
          )}
        </p>

        <div className="mt-4 jf-admin-card p-4">
          <label
            htmlFor="rgpd-policy-version"
            className="text-xs text-[var(--color-admin-text-muted)] block mb-1"
          >
            Version de la politique enregistrée sur le consentement
          </label>
          <input
            id="rgpd-policy-version"
            type="text"
            value={policyVersion}
            onChange={(e) => setPolicyVersion(e.target.value)}
            className="jf-admin-input"
          />
          <p className="text-[0.65rem] text-[var(--color-admin-text-muted)] mt-2 leading-relaxed">
            Le représentant légal enregistré en base est ton propre compte administrateur
            (traçabilité établissement).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            disabled={isLoading || rows.length === 0}
            className="jf-admin-btn-primary"
          >
            Gérer ({missingRows.length} à traiter)
          </button>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            disabled={isLoading || rows.length === 0}
            className="jf-admin-btn-secondary"
          >
            {showDetails ? 'Masquer le détail' : 'Voir le détail'}
          </button>
        </div>

        {showDetails && !isLoading && !error && rows.length > 0 && (
          <div className="mt-4 jf-admin-card p-4">
            <p className="jf-admin-section-title mb-3">Détail · classe sélectionnée</p>

            <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg)] focus-within:border-[var(--color-admin)]">
              <span role="img" aria-label="recherche" className="text-sm">🔍</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un élève…"
                className="flex-1 bg-transparent text-sm text-[var(--color-admin-text)] placeholder:text-[var(--color-admin-text-muted)] outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              {filteredRows.map((r) => (
                <div
                  key={r.userId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--color-admin-text)] font-semibold truncate">
                      {r.firstName} {r.lastName}
                    </p>
                    <p className="text-xs text-[var(--color-admin-text-muted)]">
                      Dernière mise à jour : {formatDate(r.consentDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {r.status === 'VALID' && (
                      <span className="jf-admin-chip jf-admin-chip-success">Consentement ✓</span>
                    )}
                    {r.status === 'EXPIRED' && (
                      <span
                        className="jf-admin-chip"
                        style={{
                          color: 'var(--color-admin-warning)',
                          backgroundColor: 'var(--color-admin-warning-bg)',
                          border: '1px solid color-mix(in srgb, var(--color-admin-warning) 30%, transparent)',
                        }}
                        title={
                          r.expiresAt
                            ? `Expiré depuis le ${formatDate(r.expiresAt)} — politique à renouveler`
                            : 'Politique de confidentialité obsolète — consentement à renouveler'
                        }
                      >
                        Expiré ⚠
                      </span>
                    )}
                    {(r.status === 'MISSING' || r.status === 'REVOKED') && (
                      <span className="jf-admin-chip jf-admin-chip-danger">
                        {r.status === 'REVOKED' ? 'Révoqué ✗' : 'Consentement ✗'}
                      </span>
                    )}
                    {r.status !== 'VALID' && (
                      <button
                        type="button"
                        disabled={busyUserId === r.userId || !user?.id}
                        onClick={() => recordParentalConsentRow(r.userId)}
                        className="jf-admin-btn-primary"
                      >
                        {busyUserId === r.userId
                          ? '…'
                          : r.status === 'EXPIRED' ? 'Renouveler' : 'Enregistrer'}
                      </button>
                    )}
                    {r.status === 'VALID' && (
                      <button
                        type="button"
                        disabled={busyUserId === r.userId}
                        onClick={() => revokeParentalForUser(r.userId)}
                        className="jf-admin-btn-danger"
                      >
                        {busyUserId === r.userId ? '…' : 'Révoquer'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredRows.length === 0 && (
                <p className="text-xs text-[var(--color-admin-text-muted)] text-center py-4">
                  Aucun élève trouvé.
                </p>
              )}
              {filteredRows.length > 0 && (
                <p className="text-xs text-[var(--color-admin-text-muted)] text-center pt-2">
                  {filteredRows.length} élève(s)
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Droit à l'oubli */}
      <section className="mb-6">
        <h2 className="jf-admin-section-title mb-3">Droit à l&apos;oubli</h2>
        <div className="jf-admin-card p-5">
          <p className="text-sm text-[var(--color-admin-text-secondary)] mb-2">
            Une tâche planifiée côté serveur anonymise les comptes élèves en fin d&apos;année scolaire.
            La révocation du consentement parental ci-dessus désactive immédiatement le compte concerné.
          </p>
          <p className="text-xs text-[var(--color-admin-text-muted)]">
            La suppression définitive personnalisée (hors anonymisation de masse) pourra être ajoutée
            via un endpoint dédié si ton DPO l&apos;exige.
          </p>
        </div>
      </section>

      {/* Export */}
      <section className="mb-6">
        <h2 className="jf-admin-section-title mb-3">Export des données</h2>

        <div className="jf-admin-card p-4 mb-3">
          <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="rgpd-year">
            Année scolaire (bilan de progression)
          </label>
          <select
            id="rgpd-year"
            className="jf-admin-input"
            value={selectedSchoolYear ?? ''}
            onChange={(e) => setSelectedSchoolYear(Number(e.target.value))}
            disabled={availableSchoolYears.length === 0}
          >
            {availableSchoolYears.length === 0 && (
              <option value="">Aucune année</option>
            )}
            {availableSchoolYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="jf-admin-card p-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] shrink-0">
              <span role="img" aria-label="CSV" className="text-lg">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--color-admin-text)] text-sm">
                Bilan de progression
              </p>
              <p className="text-xs text-[var(--color-admin-text-muted)] mb-3">
                Export CSV (toutes classes)
              </p>
              <button
                type="button"
                className="jf-admin-btn-primary"
                disabled={isLoading || isExporting}
                onClick={async () => {
                  try {
                    setIsExporting(true);
                    const csv = await adminApi.exportProgressCsv(selectedSchoolYear ?? undefined);
                    downloadText(
                      selectedSchoolYear != null
                        ? `progress_report_${selectedSchoolYear}.csv`
                        : 'progress_report.csv',
                      csv,
                      'text/csv;charset=utf-8'
                    );
                  } catch {
                    setError('Impossible d\u2019exporter le bilan de progression.');
                  } finally {
                    setIsExporting(false);
                  }
                }}
              >
                Télécharger
              </button>
            </div>
          </div>

          <div className="jf-admin-card p-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] shrink-0">
              <span role="img" aria-label="Registre" className="text-lg">📋</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--color-admin-text)] text-sm">
                Registre des consentements
              </p>
              <p className="text-xs text-[var(--color-admin-text-muted)] mb-3">
                Classe sélectionnée — CSV (traitement) ou PDF (DPO / archivage)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="jf-admin-btn-secondary"
                  disabled={selectedClassId == null || isLoading || isExporting || rows.length === 0}
                  onClick={async () => {
                    if (selectedClassId == null) return;
                    try {
                      setIsExporting(true);
                      const exportRows = await adminGdprApi.exportConsentRegister(selectedClassId);
                      const csv = toConsentCsv(exportRows);
                      downloadText(
                        `consents_class_${selectedClassId}.csv`,
                        csv,
                        'text/csv;charset=utf-8'
                      );
                    } catch {
                      setError('Impossible d\u2019exporter le registre (CSV).');
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                >
                  CSV
                </button>
                <button
                  type="button"
                  className="jf-admin-btn-primary"
                  disabled={selectedClassId == null || isLoading || isExporting || rows.length === 0}
                  onClick={async () => {
                    if (selectedClassId == null) return;
                    try {
                      setIsExporting(true);
                      const blob = await adminGdprApi.exportConsentRegisterPdf(selectedClassId);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `consents_class_${selectedClassId}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch {
                      setError('Impossible d\u2019exporter le registre (PDF).');
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mention légale */}
      <div className="jf-admin-card p-3">
        <p className="text-xs text-[var(--color-admin-text-muted)] leading-relaxed">
          <span role="img" aria-label="drapeau France" className="mr-1">🇫🇷</span>
          Données hébergées en France. Conformité RGPD assurée. DPO contactable via{' '}
          <span className="text-[var(--color-admin-text-secondary)] font-medium">
            dpo@juggleflow.fr
          </span>
        </p>
      </div>
    </>
  );
}
