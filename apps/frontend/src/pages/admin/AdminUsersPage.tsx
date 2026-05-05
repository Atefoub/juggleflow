import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';

const navItems = [
  { label: 'Utilisateurs', icon: '👥', path: '/admin/users' },
  { label: 'Classes',      icon: '🏫', path: '/admin/classes' },
  { label: 'RGPD',         icon: '🔒', path: '/admin/rgpd' },
];

type Role = 'Tous' | 'Enseignants' | 'Élèves';
type UserStatus = 'Actif' | 'Inactif';
type ConsentStatus = 'ok' | 'missing' | 'none';

interface AppUser {
  id: number;
  initials: string;
  firstName: string;
  lastName: string;
  role: 'Enseignant' | 'Élève';
  group: string;
  status: UserStatus;
  consent: ConsentStatus;
}

const MOCK_USERS: AppUser[] = [
  { id: 1, initials: 'MD', firstName: 'Mme',  lastName: 'Dupont',   role: 'Enseignant', group: 'CE1',  status: 'Actif',  consent: 'none'    },
  { id: 2, initials: 'PL', firstName: 'M.',   lastName: 'Lefebvre', role: 'Enseignant', group: 'CM2',  status: 'Actif',  consent: 'none'    },
  { id: 3, initials: 'LM', firstName: 'Lucas',lastName: 'Martin',   role: 'Élève',      group: 'CE1',  status: 'Actif',  consent: 'ok'      },
  { id: 4, initials: 'SF', firstName: 'Sara', lastName: 'Fontaine', role: 'Élève',      group: 'CE1',  status: 'Actif',  consent: 'missing' },
  { id: 5, initials: 'AB', firstName: 'Alex', lastName: 'Bernard',  role: 'Élève',      group: 'CM2',  status: 'Actif',  consent: 'ok'      },
];

const MISSING_CONSENT = MOCK_USERS.filter((u) => u.consent === 'missing');

const ROLE_COLORS: Record<AppUser['role'], string> = {
  Enseignant: '#4068D8',
  Élève:      '#C724B1',
};

export default function AdminUsersPage() {
  const { logout } = useAuth();
  const [roleFilter, setRoleFilter] = useState<Role>('Tous');
  const [search, setSearch]         = useState('');

  const filtered = MOCK_USERS.filter((u) => {
    const matchRole = roleFilter === 'Tous'
      || (roleFilter === 'Enseignants' && u.role === 'Enseignant')
      || (roleFilter === 'Élèves' && u.role === 'Élève');
    const matchSearch = search === ''
      || `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display font-bold text-text-primary text-2xl">Utilisateurs</h1>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-admin/20 border border-admin/40 text-xs font-semibold text-white min-h-9">
              + Créer
            </button>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg bg-border text-text-secondary min-h-9"
            >
              Quitter
            </button>
          </div>
        </div>
        <p className="text-xs text-text-muted mb-4">École Jules Ferry · 3 enseignants · 48 élèves</p>

        {/* Role filter */}
        <div className="flex gap-2 mb-3">
          {(['Tous', 'Enseignants', 'Élèves'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                roleFilter === r
                  ? 'bg-admin border-admin text-white'
                  : 'bg-bg-card border-border text-text-muted',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-card border border-border">
          <span role="img" aria-label="recherche" className="text-sm">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        {/* Missing consent alert */}
        {MISSING_CONSENT.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#1A1020] border border-cta/40">
            <span role="img" aria-label="attention" className="text-lg shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary mb-0.5">
                {MISSING_CONSENT.length} consentement{MISSING_CONSENT.length > 1 ? 's' : ''} manquant{MISSING_CONSENT.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-text-secondary">Ces élèves ne peuvent pas accéder à l'application.</p>
            </div>
            <button className="text-xs px-2 py-1.5 rounded-lg bg-cta/20 border border-cta/40 text-cta font-semibold shrink-0">
              Relancer
            </button>
          </div>
        )}

        {/* User list */}
        <div className="flex flex-col gap-2">
          {filtered.map((user) => (
            <div key={user.id} className="p-4 rounded-2xl bg-bg-card border border-border">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                {/* style intentional — dynamic role color from runtime map */}
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: ROLE_COLORS[user.role] }}
                >
                  {user.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-text-primary">
                      {user.firstName} {user.lastName}
                    </p>
                    {user.consent === 'ok' && (
                      <span className="text-xs text-success">Consentement ✓</span>
                    )}
                    {user.consent === 'missing' && (
                      <span className="text-xs text-alert">Consentement ✗</span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    {user.role} · {user.group} ·{' '}
                    <span className={user.status === 'Actif' ? 'text-success' : 'text-alert'}>
                      {user.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                {user.role === 'Enseignant' ? (
                  <>
                    <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-border text-text-secondary border border-border min-h-8">
                      Modifier
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-alert border border-alert/40 bg-alert/10 min-h-8">
                      Désactiver
                    </button>
                  </>
                ) : (
                  <>
                    <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-border text-text-secondary border border-border min-h-8">
                      Voir
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-alert border border-alert/40 bg-alert/10 min-h-8">
                      Supprimer
                    </button>
                    {user.consent === 'missing' && (
                      <button className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-cta border border-cta/40 bg-cta/10 min-h-8">
                        Relancer
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">Aucun utilisateur trouvé.</p>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}