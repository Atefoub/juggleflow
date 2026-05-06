import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi, type AdminSchoolClass } from '../../api/adminApi';
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

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div className="w-full bg-[#EBEBEB] rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full bg-[#555] transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'classes' | 'rgpd'>('classes');

  const [classes, setClasses] = useState<AdminSchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [consentRows, setConsentRows] = useState<ConsentStatusRow[]>([]);
  const [pendingByClass, setPendingByClass] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRgpd, setIsLoadingRgpd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await adminApi.getClasses();
        if (cancelled) return;
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);

        // Alertes RGPD: pending consents par classe (N appels, acceptable pour un établissement)
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
              value={isLoading ? '—' : classes.length}
              sublabel="dans l'établissement"
            />
            <KpiCard
              icon="👦"
              iconLabel="Élèves"
              label="Élèves inscrits"
              value={isLoading ? '—' : totalEleves}
              sublabel="toutes classes"
            />
            <KpiCard
              icon="👩‍🏫"
              iconLabel="Enseignants"
              label="Enseignants"
              value={isLoading ? '—' : teacherCount}
              sublabel="titulaires uniques"
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
            <button type="button" className="h-9 px-4 bg-[#111] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors">
              + Créer une classe
            </button>
            <button type="button" className="h-9 px-4 bg-white border border-[#DDD] rounded-lg text-sm font-medium text-[#444] hover:bg-[#F9F9F9] transition-colors">
              + Inviter un enseignant
            </button>
            <button type="button" className="h-9 px-4 bg-white border border-[#DDD] rounded-lg text-sm font-medium text-[#444] hover:bg-[#F9F9F9] transition-colors">
              <span role="img" aria-label="Journaux d'activité">📋</span>
              {' '}Voir les journaux
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
                    <div className="flex items-center gap-2">
                      <ProgressBar value={0} />
                      <span className="text-xs font-bold text-[#111] w-10 text-right">—</span>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 items-center">
                    <span className="font-semibold text-sm text-[#111]">{cls.name}</span>
                    <span className="text-sm text-[#555]">{cls.schoolLevel}</span>
                    <span className="text-sm text-[#555]">{cls.homeroomTeacherName ?? '—'}</span>
                    <span className="text-sm text-[#555]">{cls.studentCount}</span>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={0} />
                      <span className="text-xs font-bold text-[#111] w-9 text-right">—</span>
                    </div>
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
                  <button type="button" className="h-9 px-4 bg-[#111] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors">
                    Relancer ({alertesRgpd})
                  </button>
                  <button type="button" className="h-9 px-4 border border-[#DDD] rounded-lg text-sm font-medium text-[#444] hover:bg-[#F9F9F9] transition-colors">
                    Voir le détail
                  </button>
                </div>
              </div>

              {/* Droit à l'oubli */}
              <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                <h3 className="text-sm font-bold text-[#111] mb-2">Droit à l'oubli</h3>
                <p className="text-sm text-[#666] mb-4 leading-relaxed">
                  Suppression automatique des données élèves planifiée au{' '}
                  <strong className="text-[#333]">30 juin 2026</strong> (fin d'année scolaire).
                  Un déclenchement manuel est possible à tout moment.
                </p>
                <div className="flex items-center justify-between py-3 border-t border-[#F0F0F0]">
                  <span className="text-sm text-[#888]">Supprimer un élève manuellement</span>
                  <button type="button" className="h-8 px-3 border border-[#DDD] rounded-lg text-xs font-medium text-[#555] hover:bg-[#F9F9F9] transition-colors">
                    Sélectionner
                  </button>
                </div>
              </div>

              {/* Export */}
              <div className="bg-white border border-[#E0E0E0] rounded-xl p-5">
                <h3 className="text-sm font-bold text-[#111] mb-4">Export des données</h3>
                <div className="space-y-3">
                  {[
                    { fmt: 'CSV', titre: 'Bilan de progression',       detail: 'Toutes les classes · Année en cours', ariaLabel: 'Télécharger le bilan CSV' },
                    { fmt: 'PDF', titre: 'Registre des consentements', detail: 'Format PDF signé · RGPD conforme',    ariaLabel: 'Télécharger le registre PDF' },
                  ].map(({ fmt, titre, detail, ariaLabel }) => (
                    <div key={fmt} className="flex items-center gap-3 p-3 border border-[#E0E0E0] rounded-lg">
                      <div className="w-9 h-9 bg-[#EBEBEB] border border-[#DDD] rounded-lg flex items-center justify-center text-xs font-bold text-[#666] shrink-0">
                        {fmt}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#111]">{titre}</div>
                        <div className="text-xs text-[#999]">{detail}</div>
                      </div>
                      <button
                        type="button"
                        aria-label={ariaLabel}
                        className="w-8 h-8 bg-[#111] rounded-lg flex items-center justify-center text-white text-sm hover:bg-[#333] transition-colors shrink-0"
                      >
                        ↓
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-[#F9F9F9] border-l-2 border-[#CCC] rounded-r-lg">
                  <p className="text-xs text-[#888] leading-relaxed">
                    Données hébergées en France. Conformité RGPD assurée.
                    DPO contactable via{' '}
                    <span className="text-[#555] font-medium">dpo@juggleflow.fr</span>
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
