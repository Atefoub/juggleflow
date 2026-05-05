import { useState } from 'react';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';

const navItems = [
  { label: 'Utilisateurs', icon: '👥', path: '/admin/users' },
  { label: 'Classes',      icon: '🏫', path: '/admin/classes' },
  { label: 'RGPD',         icon: '🔒', path: '/admin/rgpd' },
];

const CONSENT_STATS = { accordes: 45, manquants: 3, expires: 2 };
const DELETE_DATE   = '30/06/2026';

export default function AdminRgpdPage() {
  const [deleteMode, setDeleteMode] = useState(false);
  const total = CONSENT_STATS.accordes + CONSENT_STATS.manquants + CONSENT_STATS.expires;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-1">RGPD &amp; Export</h1>
        <p className="text-xs text-text-muted">Conformité des données · École Jules Ferry</p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Consent stats */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Consentements parentaux
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { value: CONSENT_STATS.accordes,  label: 'Accordés',  color: 'text-success', bg: 'bg-success/10 border-success/30' },
              { value: CONSENT_STATS.manquants, label: 'Manquants', color: 'text-alert',   bg: 'bg-alert/10   border-alert/30'   },
              { value: CONSENT_STATS.expires,   label: 'Expirés',   color: 'text-cta',     bg: 'bg-cta/10     border-cta/30'     },
            ].map((stat) => (
              <div key={stat.label} className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${stat.bg}`}>
                <span className={`font-display text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>

          <ProgressBar
            value={Math.round((CONSENT_STATS.accordes / total) * 100)}
            color="#22C55E"
            height="6px"
          />
          <p className="text-xs text-text-muted mt-1">{CONSENT_STATS.accordes} / {total} consentements accordés</p>

          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-cta min-h-10 hover:opacity-90 transition-opacity">
              Relancer ({CONSENT_STATS.manquants})
            </button>
            <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-text-secondary bg-bg-card min-h-10">
              Voir détails
            </button>
          </div>
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
                id: 'csv',
                icon: '📊',
                iconLabel: 'CSV',
                title: 'Bilan de progression',
                subtitle: 'Toutes les classes · Année en cours',
                badge: 'CSV',
                badgeClass: 'text-info bg-info/10 border-info/30',
              },
              {
                id: 'pdf',
                icon: '📋',
                iconLabel: 'PDF',
                title: 'Registre des consentements',
                subtitle: 'Format PDF signé · RGPD conforme',
                badge: 'PDF',
                badgeClass: 'text-alert bg-alert/10 border-alert/30',
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