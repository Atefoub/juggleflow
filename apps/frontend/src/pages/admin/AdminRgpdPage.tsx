import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { adminApi, type AdminSchoolClass } from '../../api/adminApi';
import { adminGdprApi, type ConsentStatusRow } from '../../api/adminGdprApi';

const navItems = [
  { label: 'Utilisateurs', icon: '👥', path: '/admin/users' },
  { label: 'Classes',      icon: '🏫', path: '/admin/classes' },
  { label: 'RGPD',         icon: '🔒', path: '/admin/rgpd' },
];

const DELETE_DATE   = '30/06/2026';

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
  const [deleteMode, setDeleteMode] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<AdminSchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-1">RGPD &amp; Export</h1>
        <p className="text-xs text-text-muted">Conformité des données · École Jules Ferry</p>
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

          <div className="flex gap-2 mt-3">
            <button
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-cta min-h-10 hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={isLoading || missingRows.length === 0}
              title="À implémenter : relance (email/ENT) via backend"
            >
              Relancer ({missingRows.length})
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
                    className="flex items-center justify-between p-3 rounded-xl bg-bg-primary border border-border"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary font-semibold truncate">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="text-xs text-text-muted">
                        Dernière mise à jour : {formatDate(r.consentDate)}
                      </p>
                    </div>
                    <span className={[
                      'text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0',
                      r.hasParentalConsent
                        ? 'text-success bg-success/10 border-success/30'
                        : 'text-alert bg-alert/10 border-alert/30',
                    ].join(' ')}>
                      {r.hasParentalConsent ? 'Consentement ✓' : 'Consentement ✗'}
                    </span>
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

        {/* Right to be forgotten */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Droit à l'oubli
          </h2>
          <div className="p-4 rounded-2xl bg-bg-card border border-border">
            <p className="text-sm text-text-secondary mb-3">
              Suppression automatique des données élèves à la fin de l'année scolaire ({DELETE_DATE}).
            </p>
            <div className="flex items-center gap-2 mb-3 p-2 rounded-xl bg-alert/10 border border-alert/30">
              <span role="img" aria-label="calendrier" className="text-lg">📅</span>
              <div>
                <p className="text-xs font-semibold text-alert">Suppression planifiée</p>
                <p className="text-xs text-text-muted">{DELETE_DATE}</p>
              </div>
            </div>

            {!deleteMode ? (
              <button
                onClick={() => setDeleteMode(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-alert border border-alert/40 bg-alert/10 min-h-10"
              >
                Supprimer un élève manuellement
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-alert font-semibold">Sélectionner un élève à supprimer</p>
                {['Lucas Martin', 'Sara Fontaine', 'Alex Bernard'].map((name) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-bg-primary border border-border">
                    <span className="text-sm text-text-primary">{name}</span>
                    <button className="text-xs px-2 py-1 rounded-lg text-alert border border-alert/40 bg-alert/10">
                      Supprimer
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setDeleteMode(false)}
                  className="text-xs text-text-muted mt-1 self-center"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Data export */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Export des données
          </h2>
          <div className="flex flex-col gap-3">
            {[
              {
                id: 'progress-csv',
                icon: '📊',
                iconLabel: 'CSV',
                title: 'Bilan de progression',
                subtitle: 'À implémenter (backend)',
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
                      item.id !== 'consents-csv'
                      || selectedClassId == null
                      || isLoading
                      || isExporting
                      || rows.length === 0
                    }
                    onClick={async () => {
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