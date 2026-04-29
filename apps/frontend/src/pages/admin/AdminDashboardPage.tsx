import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolClass {
  id: number;
  nom: string;
  niveauScolaire: string;
  enseignant: string;
  nombreEleves: number;
  progressionMoyenne: number;
  statut: 'actif' | 'inactif';
}

interface ConsentStats {
  accordes: number;
  enAttente: number;
  expires: number;
}

// ─── Données mockées ──────────────────────────────────────────────────────────

const MOCK_CLASSES: SchoolClass[] = [
  { id: 1, nom: 'CE1 — Groupe A', niveauScolaire: 'CE1', enseignant: 'Mme Dupont',  nombreEleves: 24, progressionMoyenne: 73, statut: 'actif' },
  { id: 2, nom: 'CE2 — Groupe B', niveauScolaire: 'CE2', enseignant: 'M. Lefebvre', nombreEleves: 22, progressionMoyenne: 58, statut: 'actif' },
  { id: 3, nom: 'CM1 — Groupe C', niveauScolaire: 'CM1', enseignant: 'Mme Bernard', nombreEleves: 27, progressionMoyenne: 81, statut: 'actif' },
  { id: 4, nom: 'CM2 — Groupe D', niveauScolaire: 'CM2', enseignant: 'M. Moreau',   nombreEleves: 19, progressionMoyenne: 44, statut: 'inactif' },
];

const MOCK_CONSENT: ConsentStats = { accordes: 78, enAttente: 5, expires: 2 };

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
        {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
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

// Barre de progression sans style inline :
// On utilise des classes Tailwind arbitraires w-[N%].
// Note : les classes dynamiques doivent être safelisted dans tailwind.config.js
// si le purge est actif (ex. safelist: [{ pattern: /^w-\[/ }]).
interface ProgressBarProps {
  value: number;
}

function ProgressBar({ value }: ProgressBarProps) {
  // Arrondi au multiple de 5 le plus proche pour limiter les classes à générer
  const rounded = Math.round(value / 5) * 5;
  const widthClass = `w-[${rounded}%]`;
  return (
    <div className="w-full bg-[#EBEBEB] rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full bg-[#555] transition-all duration-500 ${widthClass}`} />
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'classes' | 'rgpd'>('classes');

  const totalEleves       = MOCK_CLASSES.reduce((s, c) => s + c.nombreEleves, 0);
  const classesActives    = MOCK_CLASSES.filter((c) => c.statut === 'actif').length;
  const progressionGlobale = Math.round(
    MOCK_CLASSES.reduce((s, c) => s + c.progressionMoyenne, 0) / MOCK_CLASSES.length
  );
  const alertesRgpd = MOCK_CONSENT.enAttente + MOCK_CONSENT.expires;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-[#E0E0E0] px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-xs text-[#999] uppercase tracking-widest font-semibold mb-0.5">
            Administrateur
          </div>
          <div className="text-base font-bold text-[#111]">École Jules Ferry</div>
        </div>
        <button
          type="button"
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
            <KpiCard icon="🏫" iconLabel="Établissement" label="Classes actives"    value={classesActives}           sublabel={`sur ${MOCK_CLASSES.length} classes`} />
            <KpiCard icon="👦" iconLabel="Élèves"        label="Élèves inscrits"    value={totalEleves}              sublabel="cette année" />
            <KpiCard icon="👩‍🏫" iconLabel="Enseignants"  label="Enseignants"        value={4}                        sublabel="comptes actifs" />
            <KpiCard icon="📈" iconLabel="Progression"   label="Progression globale" value={`${progressionGlobale}%`} sublabel="moyenne établissement" />
          </div>
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

              {MOCK_CLASSES.map((cls, i) => (
                <div
                  key={cls.id}
                  className={`px-5 py-4 ${i < MOCK_CLASSES.length - 1 ? 'border-b border-[#F0F0F0]' : ''}`}
                >
                  {/* Mobile */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#111]">{cls.nom}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls.statut === 'actif' ? 'bg-[#EBEBEB] text-[#333]' : 'bg-[#F5F5F5] text-[#AAA]'}`}>
                        {cls.statut === 'actif' ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div className="text-xs text-[#888]">
                      {cls.enseignant} · {cls.nombreEleves} élèves · {cls.niveauScolaire}
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={cls.progressionMoyenne} />
                      <span className="text-xs font-bold text-[#111] w-10 text-right">{cls.progressionMoyenne}%</span>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 items-center">
                    <span className="font-semibold text-sm text-[#111]">{cls.nom}</span>
                    <span className="text-sm text-[#555]">{cls.niveauScolaire}</span>
                    <span className="text-sm text-[#555]">{cls.enseignant}</span>
                    <span className="text-sm text-[#555]">{cls.nombreEleves}</span>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={cls.progressionMoyenne} />
                      <span className="text-xs font-bold text-[#111] w-9 text-right">{cls.progressionMoyenne}%</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${cls.statut === 'actif' ? 'bg-[#EBEBEB] text-[#333]' : 'bg-[#F5F5F5] text-[#AAA]'}`}>
                      {cls.statut === 'actif' ? 'Actif' : 'Inactif'}
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
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-[#F5F5F5] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#111]">{MOCK_CONSENT.accordes}</div>
                    <div className="text-xs text-[#888] mt-1">Accordés</div>
                  </div>
                  <div className="bg-[#F0F0F0] rounded-lg p-3 text-center border border-[#DDD]">
                    <div className="text-2xl font-bold text-[#111]">{MOCK_CONSENT.enAttente}</div>
                    <div className="text-xs font-semibold text-[#555] mt-1">En attente</div>
                  </div>
                  <div className="bg-[#F5F5F5] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[#777]">{MOCK_CONSENT.expires}</div>
                    <div className="text-xs text-[#999] mt-1">Expirés</div>
                  </div>
                </div>
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
                    { fmt: 'CSV', titre: 'Bilan de progression',        detail: 'Toutes les classes · Année en cours', ariaLabel: 'Télécharger le bilan CSV' },
                    { fmt: 'PDF', titre: 'Registre des consentements',  detail: 'Format PDF signé · RGPD conforme',    ariaLabel: 'Télécharger le registre PDF' },
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