import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi, type AdminEstablishmentStats, type AdminSchoolClass } from '../../api/adminApi';
import { adminGdprApi, type ConsentStatusRow } from '../../api/adminGdprApi';

// ─── Sous-composants ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: string;
  iconLabel: string;
}

function KpiCard({ label, value, sublabel, icon, iconLabel }: KpiCardProps) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg flex items-center justify-center text-lg shrink-0">
        <span role="img" aria-label={iconLabel}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-[#111] leading-none mb-1">{value}</div>
        <div className="text-xs font-semibold text-[#555] uppercase tracking-wide">{label}</div>
        {sublabel && <div className="text-xs text-[#999] mt-1">{sublabel}</div>}
      </div>
    </div>
  );
}

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

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'classes' | 'rgpd'>('classes');

  const [classes, setClasses] = useState<AdminSchoolClass[]>([]);
  const [stats, setStats] = useState<AdminEstablishmentStats | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [consentRows, setConsentRows] = useState<ConsentStatusRow[]>([]);
  const [pendingByClass, setPendingByClass] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRgpd, setIsLoadingRgpd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressExportYear, setProgressExportYear] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [data, statsData] = await Promise.all([
          adminApi.getClasses(),
          adminApi.getEstablishmentStats().catch(() => null),
        ]);
        if (cancelled) return;
        setClasses(data);
        setStats(statsData);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
          setProgressExportYear((y) => (y == null ? Math.max(...data.map((c) => c.schoolYear)) : y));
        }

        const pendingPairs = await Promise.all(
          data.map(async (c) => [c.id, await adminGdprApi.getPendingCount(c.id)] as const)
        );
        if (cancelled) return;
        setPendingByClass(Object.fromEntries(pendingPairs));
      } catch {
        if (!cancelled) setError('Impossible de charger le dashboard admin.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedClassId == null) return;
    let cancelled = false;

    const loadRgpd = async () => {
      try {
        setIsLoadingRgpd(true);
        const rows = await adminGdprApi.getClassConsentStatus(selectedClassId);
        if (!cancelled) setConsentRows(rows);
      } catch {
        if (!cancelled) setConsentRows([]);
      } finally {
        if (!cancelled) setIsLoadingRgpd(false);
      }
    };

    loadRgpd();
    return () => { cancelled = true; };
  }, [selectedClassId]);

  const totalEleves = useMemo(
    () => classes.reduce((s, c) => s + c.studentCount, 0),
    [classes]
  );

  const teacherCount = useMemo(() => {
    const names = classes
      .map((c) => c.homeroomTeacherName)
      .filter((n): n is string => n != null && n.trim() !== '');
    return new Set(names).size;
  }, [classes]);

  const alertesRgpd = useMemo(
    () => Object.values(pendingByClass).reduce((s, n) => s + n, 0),
    [pendingByClass]
  );

  const consentStats = useMemo(() => {
    const accordes = consentRows.filter((r) => r.hasParentalConsent).length;
    const manquants = consentRows.filter((r) => !r.hasParentalConsent).length;
    return { accordes, manquants };
  }, [consentRows]);

  const progressYearOptions = useMemo(() => {
    const years = [...new Set(classes.map((c) => c.schoolYear))].sort((a, b) => b - a);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [classes]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-[#E0E0E0] px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-xs text-[#999] uppercase tracking-widest font-semibold mb-0.5">
            Administrateur
          </div>
          <div className="text-base font-bold text-[#111]">
            {user ? `${user.firstName} ${user.lastName}` : 'École JuggleFlow'}
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="h-9 px-4 border border-[#DDD] rounded-lg text-sm font-medium text-[#555] hover:bg-[#F5F5F5] transition-colors"
        >
          Déconnexion
        </button>
      </header>

      <main className="flex-1 p-5 max-w-4xl mx-auto w-full space-y-6">

        {/* ── KPI Cards ── */}
        <section>
          <h2 className="text-xs font-bold text-[#888] uppercase tracking-widest mb-3">
            Vue d'ensemble
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              icon="🏫"
              iconLabel="Établissement"
              label="Classes"
              value={isLoading ? '—' : (stats != null ? stats.classCount : classes.length)}
              sublabel="dans l'établissement"
            />
            <KpiCard
              icon="👦"
              iconLabel="Élèves"
              label="Élèves inscrits"
              value={isLoading ? '—' : (stats != null ? stats.studentCount : totalEleves)}
              sublabel="toutes classes"
            />
            <KpiCard
              icon="👩‍🏫"
              iconLabel="Enseignants"
              label="Enseignants"
              value={isLoading ? '—' : (stats != null ? stats.teacherAccountCount : teacherCount)}
              sublabel={stats != null ? 'comptes enseignant' : 'titulaires uniques'}
            />
            <KpiCard
              icon="🔒"
              iconLabel="RGPD"
              label="Consentements manquants"
              value={isLoading ? '—' : alertesRgpd}
              sublabel="toutes classes"
            />
          </div>
          {error && (
            <p className="text-sm text-[#B00020] mt-3">{error}</p>
          )}
        </section>

        {/* ── Actions rapides ── */}
        <section>
          <h2 className="text-xs font-bold text-[#888] uppercase tracking-widest mb-3">
            Actions rapides
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/classes')}
              className="h-9 px-4 bg-[#111] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors"
            >
              + Créer une classe
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="h-9 px-4 bg-white border border-[#DDD] rounded-lg text-sm font-medium text-[#444] hover:bg-[#F9F9F9] transition-colors"
            >
              Gérer les comptes
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/audit')}
              className="h-9 px-4 bg-white border border-[#DDD] rounded-lg text-sm font-medium text-[#444] hover:bg-[#F9F9F9] transition-colors"
            >
              <span role="img" aria-label="Journaux d'activité">📋</span>
              {' '}Journal d&apos;audit
            </button>
          </div>
        </section>

        {/* ── Onglets ── */}
        <section>
          <div className="flex border-b border-[#E0E0E0] mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'classes'
                  ? 'border-[#111] text-[#111]'
                  : 'border-transparent text-[#999] hover:text-[#555]'
              }`}
            >
              Classes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rgpd')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'rgpd'
                  ? 'border-[#111] text-[#111]'
                  : 'border-transparent text-[#999] hover:text-[#555]'
              }`}
            >
              RGPD &amp; Données
              {alertesRgpd > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-[#111] text-white text-xs font-bold rounded-full">
                  {alertesRgpd}
                </span>
              )}
            </button>
          </div>

          {/* ── Tableau classes ── */}
          {activeTab === 'classes' && (
            <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden">
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 px-5 py-3 bg-[#F9F9F9] border-b border-[#E0E0E0]">
                {['Classe', 'Niveau', 'Enseignant', 'Élèves', 'Progression', 'Statut'].map((h) => (
                  <div key={h} className="text-xs font-bold text-[#888] uppercase tracking-wide">{h}</div>
                ))}
              </div>

              {classes.map((cls, i) => (
                <div
                  key={cls.id}
                  className={`px-5 py-4 ${i < classes.length - 1 ? 'border-b border-[#F0F0F0]' : ''}`}
                >
                  {/* Mobile */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#111]">{cls.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EBEBEB] text-[#333]">
                        Actif
                      </span>
                    </div>
                    <div className="text-xs text-[#888]">
                      {(cls.homeroomTeacherName ?? '—')} · {cls.studentCount} élèves · {cls.schoolLevel}
                    </div>
                    <div className="text-xs text-[#888]">
                      Détail sur la page Classes
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 items-center">
                    <span className="font-semibold text-sm text-[#111]">{cls.name}</span>
                    <span className="text-sm text-[#555]">{cls.schoolLevel}</span>
                    <span className="text-sm text-[#555]">{cls.homeroomTeacherName ?? '—'}</span>
                    <span className="text-sm text-[#555]">{cls.studentCount}</span>
                    <span className="text-xs text-[#888]">—</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full w-fit bg-[#EBEBEB] text-[#333]">
                      Actif
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Section RGPD ── */}
          {activeTab === 'rgpd' && (
            <div className="space-y-4">

              {/* Consentements */}
              <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                <h3 className="text-sm font-bold text-[#111] mb-4">Consentements parentaux</h3>

                <div className="mb-4">
                  <div className="text-xs text-[#888] mb-2">Classe</div>
                  <select
                    className="w-full h-10 px-3 border border-[#DDD] rounded-lg text-sm text-[#111] bg-white"
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
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-[#F5F5F5] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#111]">
                      {isLoadingRgpd ? '—' : consentStats.accordes}
                    </div>
                    <div className="text-xs text-[#888] mt-1">Accordés</div>
                  </div>
                  <div className="bg-[#F0F0F0] rounded-lg p-3 text-center border border-[#DDD]">
                    <div className="text-2xl font-bold text-[#111]">
                      {isLoadingRgpd ? '—' : (selectedClassId != null ? (pendingByClass[selectedClassId] ?? 0) : 0)}
                    </div>
                    <div className="text-xs font-semibold text-[#555] mt-1">En attente</div>
                  </div>
                  <div className="bg-[#F5F5F5] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#777]">0</div>
                    <div className="text-xs text-[#999] mt-1">Expirés</div>
                  </div>
                </div>

                {!isLoadingRgpd && consentRows.length > 0 && (
                  <div className="space-y-2">
                    {consentRows.slice(0, 6).map((r) => (
                      <div
                        key={r.userId}
                        className="flex items-center justify-between p-3 border border-[#E0E0E0] rounded-lg"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#111] truncate">
                            {r.firstName} {r.lastName}
                          </div>
                          <div className="text-xs text-[#999]">
                            {formatDate(r.consentDate)}
                          </div>
                        </div>
                        <div className="text-xs font-semibold">
                          {r.hasParentalConsent ? 'Consentement ✓' : 'Consentement ✗'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/rgpd')}
                    className="h-9 px-4 bg-[#111] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors"
                  >
                    Gérer les consentements ({alertesRgpd} en attente)
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/rgpd')}
                    className="h-9 px-4 border border-[#DDD] rounded-lg text-sm font-medium text-[#444] hover:bg-[#F9F9F9] transition-colors"
                  >
                    Page RGPD complète
                  </button>
                </div>
              </div>

              {/* Droit à l'oubli */}
              <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                <h3 className="text-sm font-bold text-[#111] mb-2">Droit à l&apos;oubli</h3>
                <p className="text-sm text-[#666] leading-relaxed">
                  Anonymisation de fin d&apos;année gérée côté serveur. La révocation d&apos;un consentement parental
                  désactive tout de suite le compte élève concerné — depuis la page RGPD.
                </p>
              </div>

              {/* Export */}
              <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                <h3 className="text-sm font-bold text-[#111] mb-4">Export des données</h3>
                {exportMessage && (
                  <p className="text-xs text-[#B00020] mb-3">{exportMessage}</p>
                )}
                <div className="space-y-4">
                  <div className="p-3 border border-[#E0E0E0] rounded-lg">
                    <div className="text-sm font-semibold text-[#111] mb-2">Bilan de progression (CSV)</div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <label htmlFor="dash-export-year" className="text-xs text-[#888]">Année</label>
                      <select
                        id="dash-export-year"
                        className="h-9 px-2 border border-[#DDD] rounded-lg text-sm bg-white"
                        value={progressExportYear ?? ''}
                        onChange={(e) => setProgressExportYear(Number(e.target.value))}
                        disabled={progressYearOptions.length === 0}
                      >
                        {progressYearOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={isExporting || progressExportYear == null}
                      onClick={async () => {
                        setExportMessage(null);
                        try {
                          setIsExporting(true);
                          const csv = await adminApi.exportProgressCsv(progressExportYear ?? undefined);
                          downloadText(
                            `progress_report_${progressExportYear ?? 'all'}.csv`,
                            csv,
                            'text/csv;charset=utf-8',
                          );
                        } catch {
                          setExportMessage('Export progression impossible.');
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                      className="h-9 px-4 bg-[#111] text-white rounded-lg text-sm font-semibold hover:bg-[#333] disabled:opacity-50"
                    >
                      {isExporting ? '…' : 'Télécharger CSV'}
                    </button>
                  </div>
                  <div className="p-3 border border-[#E0E0E0] rounded-lg">
                    <div className="text-sm font-semibold text-[#111] mb-1">Registre des consentements (CSV)</div>
                    <div className="text-xs text-[#999] mb-2">Classe sélectionnée ci-dessus</div>
                    <button
                      type="button"
                      disabled={isExporting || selectedClassId == null}
                      onClick={async () => {
                        if (selectedClassId == null) return;
                        setExportMessage(null);
                        try {
                          setIsExporting(true);
                          const rows = await adminGdprApi.exportConsentRegister(selectedClassId);
                          const csv = toConsentCsv(rows);
                          downloadText(`consents_class_${selectedClassId}.csv`, csv, 'text/csv;charset=utf-8');
                        } catch {
                          setExportMessage('Export consentements impossible.');
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                      className="h-9 px-4 bg-[#111] text-white rounded-lg text-sm font-semibold hover:bg-[#333] disabled:opacity-50"
                    >
                      {isExporting ? '…' : 'Télécharger CSV'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-[#F9F9F9] border-l-2 border-[#CCC] rounded-r-lg">
                  <p className="text-xs text-[#888] leading-relaxed">
                    Exports réels via l’API admin. Pour le PDF ou une suppression ciblée, voir la feuille de route produit / DPO.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
