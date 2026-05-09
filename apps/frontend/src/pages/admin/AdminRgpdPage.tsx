import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { useAuth } from '../../context/AuthContext';
import { adminApi, type AdminSchoolClass } from '../../api/adminApi';
import { adminGdprApi, type ConsentStatusRow } from '../../api/adminGdprApi';

const navItems = [
  { label: 'Utilisateurs', icon: '👥', path: '/admin/users' },
  { label: 'Classes',      icon: '🏫', path: '/admin/classes' },
  { label: 'RGPD',         icon: '🔒', path: '/admin/rgpd' },
  { label: 'Journal',      icon: '📋', path: '/admin/audit' },
];

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
    const accordes = rows.filter((r) => r.hasParentalConsent).length;
    const manquants = rows.filter((r) => !r.hasParentalConsent).length;
    return { accordes, manquants, expires: 0 };
  }, [rows]);

  const total = consentStats.accordes + consentStats.manquants + consentStats.expires;
  const progressValue = total === 0 ? 0 : Math.round((consentStats.accordes / total) * 100);

  const missingRows = useMemo(
    () => rows.filter((r) => !r.hasParentalConsent),
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
      setError('Impossible d’enregistrer le consentement.');
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
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-1">RGPD &amp; Export</h1>
        <p className="text-xs text-text-muted">Conformité des données · établissement</p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Class selector */}
        <section className="p-4 rounded-2xl bg-bg-card border border-border">
          <p className="text-xs text-text-muted mb-2">Classe</p>
          <select
            className="w-full px-3 py-2.5 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
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
            <p className="text-xs text-alert mt-2">{error}</p>
          )}
        </section>

        {/* Consent stats */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Consentements parentaux
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { value: consentStats.accordes,  label: 'Accordés',  color: 'text-success', bg: 'bg-success/10 border-success/30' },
              { value: consentStats.manquants, label: 'Manquants', color: 'text-alert',   bg: 'bg-alert/10   border-alert/30'   },
              { value: consentStats.expires,   label: 'Expirés',   color: 'text-cta',     bg: 'bg-cta/10     border-cta/30'     },
            ].map((stat) => (
              <div key={stat.label} className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${stat.bg}`}>
                <span className={`font-display text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>

          <ProgressBar
            value={progressValue}
            color="#22C55E"
            height="6px"
          />
          <p className="text-xs text-text-muted mt-1">
            {consentStats.accordes} / {total} consentements accordés
            {selectedClassId != null && (
              <>
                {' '}· {pendingCount} en attente
              </>
            )}
          </p>

          <div className="mt-3 p-3 rounded-xl bg-bg-primary border border-border">
            <label htmlFor="rgpd-policy-version" className="text-xs text-text-muted block mb-1">
              Version de la politique enregistrée sur le consentement
            </label>
            <input
              id="rgpd-policy-version"
              type="text"
              value={policyVersion}
              onChange={(e) => setPolicyVersion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border text-sm text-text-primary outline-none"
            />
            <p className="text-[0.65rem] text-text-muted mt-2 leading-relaxed">
              Le représentant légal enregistré en base est ton propre compte administrateur (traçabilité établissement).
            </p>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              disabled={isLoading || rows.length === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-cta min-h-10 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Gérer ({missingRows.length} sans consentement)
            </button>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              disabled={isLoading || rows.length === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-text-secondary bg-bg-card min-h-10 disabled:opacity-50"
            >
              {showDetails ? 'Masquer' : 'Voir détails'}
            </button>
          </div>

          {showDetails && !isLoading && !error && rows.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-bg-card border border-border">
              <p className="text-xs text-text-muted mb-3">Détail (classe sélectionnée)</p>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-primary border border-border mb-3">
                <span role="img" aria-label="recherche" className="text-sm">🔍</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un élève…"
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                {filteredRows.map((r) => (
                  <div
                    key={r.userId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-bg-primary border border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary font-semibold truncate">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="text-xs text-text-muted">
                        Dernière mise à jour : {formatDate(r.consentDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className={[
                        'text-xs font-semibold px-2 py-0.5 rounded-full border',
                        r.hasParentalConsent
                          ? 'text-success bg-success/10 border-success/30'
                          : 'text-alert bg-alert/10 border-alert/30',
                      ].join(' ')}>
                        {r.hasParentalConsent ? 'Consentement ✓' : 'Consentement ✗'}
                      </span>
                      {!r.hasParentalConsent && (
                        <button
                          type="button"
                          disabled={busyUserId === r.userId || !user?.id}
                          onClick={() => recordParentalConsentRow(r.userId)}
                          className="text-xs px-2 py-1 rounded-lg font-semibold text-white bg-brand border border-brand min-h-8 disabled:opacity-40"
                        >
                          {busyUserId === r.userId ? '…' : 'Enregistrer'}
                        </button>
                      )}
                      {r.hasParentalConsent && (
                        <button
                          type="button"
                          disabled={busyUserId === r.userId}
                          onClick={() => revokeParentalForUser(r.userId)}
                          className="text-xs px-2 py-1 rounded-lg font-semibold text-alert border border-alert/40 bg-alert/10 min-h-8 disabled:opacity-40"
                        >
                          {busyUserId === r.userId ? '…' : 'Révoquer'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredRows.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-4">
                    Aucun élève trouvé.
                  </p>
                )}
                {filteredRows.length > 0 && (
                  <p className="text-xs text-text-muted text-center pt-2">
                    {filteredRows.length} élève(s)
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Droit à l'oubli — information */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Droit à l&apos;oubli
          </h2>
          <div className="p-4 rounded-2xl bg-bg-card border border-border">
            <p className="text-sm text-text-secondary mb-2">
              Une tâche planifiée côté serveur anonymise les comptes élèves en fin d&apos;année scolaire. La révocation du
              consentement parental ci-dessus désactive immédiatement le compte concerné.
            </p>
            <p className="text-xs text-text-muted">
              La suppression définitive personnalisée (hors anonymisation de masse) pourra être ajoutée via un endpoint dédié si ton DPO l&apos;exige.
            </p>
          </div>
        </section>

        {/* Data export */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Export des données
          </h2>

          <div className="p-4 rounded-2xl bg-bg-card border border-border mb-3">
            <p className="text-xs text-text-muted mb-2">Année scolaire (pour le bilan de progression)</p>
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-bg-primary border border-border text-sm text-text-primary outline-none"
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

          <div className="flex flex-col gap-3">
            {[
              {
                id: 'progress-csv',
                icon: '📊',
                iconLabel: 'CSV',
                title: 'Bilan de progression',
                subtitle: 'Export CSV (toutes classes)',
                badge: 'CSV',
                badgeClass: 'text-info bg-info/10 border-info/30',
              },
              {
                id: 'consents-csv',
                icon: '📋',
                iconLabel: 'CSV',
                title: 'Registre des consentements',
                subtitle: 'Export CSV (RGPD)',
                badge: 'CSV',
                badgeClass: 'text-info bg-info/10 border-info/30',
              },
            ].map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-4 rounded-2xl bg-bg-card border border-border">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-bg-primary border border-border shrink-0">
                  <span role="img" aria-label={item.iconLabel} className="text-xl">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-text-primary text-sm">{item.title}</p>
                  <p className="text-xs text-text-muted">{item.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${item.badgeClass}`}>
                    {item.badge}
                  </span>
                  <button
                    aria-label={`Télécharger ${item.title}`}
                    className="text-xs px-2 py-1 rounded-lg bg-border text-text-secondary"
                    disabled={
                      (item.id === 'consents-csv' && (
                        selectedClassId == null
                        || isLoading
                        || isExporting
                        || rows.length === 0
                      ))
                      || (item.id === 'progress-csv' && (
                        isLoading
                        || isExporting
                      ))
                    }
                    onClick={async () => {
                      if (item.id === 'progress-csv') {
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
                          setError('Impossible d’exporter le bilan de progression.');
                        } finally {
                          setIsExporting(false);
                        }
                        return;
                      }

                      if (item.id !== 'consents-csv') return;
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
                        setError('Impossible d’exporter le registre des consentements.');
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Legal footer */}
        <div className="p-3 rounded-xl bg-bg-card border border-border">
          <p className="text-xs text-text-muted leading-relaxed">
            <span role="img" aria-label="drapeau France" className="mr-1">🇫🇷</span>
            Données hébergées en France. Conformité RGPD assurée. DPO contactable via{' '}
            <span className="text-text-secondary font-medium">dpo@juggleflow.fr</span>
          </p>
        </div>
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}