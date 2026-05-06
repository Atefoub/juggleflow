import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import { adminApi, type AdminUser } from '../../api/adminApi';

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
  role: 'Enseignant' | 'Élève' | 'Admin';
  group: string;
  status: UserStatus;
  consent: ConsentStatus;
}

function makeInitials(firstName: string, lastName: string): string {
  const fi = firstName?.trim().charAt(0) ?? '';
  const li = lastName?.trim().charAt(0) ?? '';
  const initials = `${fi}${li}`.toUpperCase();
  return initials === '' ? '?' : initials;
}

function toAppUser(u: AdminUser): AppUser {
  const role: AppUser['role'] =
    u.role === 'ROLE_ENSEIGNANT' ? 'Enseignant'
      : u.role === 'ROLE_ELEVE' ? 'Élève'
        : 'Admin';

  return {
    id: u.id,
    initials: makeInitials(u.firstName, u.lastName),
    firstName: u.firstName,
    lastName: u.lastName,
    role,
    group: u.className ?? '—',
    status: u.enabled ? 'Actif' : 'Inactif',
    consent: u.parentalConsentStatus,
  };
}

const ROLE_COLORS: Record<AppUser['role'], string> = {
  Enseignant: '#4068D8',
  Élève:      '#C724B1',
  Admin:      '#8B2BE2',
};

export default function AdminUsersPage() {
  const { logout } = useAuth();
  const [roleFilter, setRoleFilter] = useState<Role>('Tous');
  const [search, setSearch]         = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiUsers = await adminApi.getUsers();
        if (cancelled) return;
        setUsers(apiUsers.map(toAppUser));
      } catch {
        if (!cancelled) setError('Impossible de charger les utilisateurs.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === 'Tous'
        || (roleFilter === 'Enseignants' && u.role === 'Enseignant')
        || (roleFilter === 'Élèves' && u.role === 'Élève');
      const matchSearch = search === ''
        || `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [roleFilter, search, users]);

  const missingConsent = useMemo(
    () => users.filter((u) => u.consent === 'missing'),
    [users]
  );

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
        <p className="text-xs text-text-muted mb-4">Gestion des utilisateurs</p>

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
        {missingConsent.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#1A1020] border border-cta/40">
            <span role="img" aria-label="attention" className="text-lg shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary mb-0.5">
                {missingConsent.length} consentement{missingConsent.length > 1 ? 's' : ''} manquant{missingConsent.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-text-secondary">Ces élèves ne peuvent pas accéder à l'application.</p>
            </div>
            <button className="text-xs px-2 py-1.5 rounded-lg bg-cta/20 border border-cta/40 text-cta font-semibold shrink-0">
              Relancer
            </button>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-text-muted text-center py-8">Chargement…</p>
        )}

        {!isLoading && error && (
          <p className="text-sm text-alert text-center py-8">{error}</p>
        )}

        {/* User list */}
        {!isLoading && !error && (
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
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">Aucun utilisateur trouvé.</p>
        )}
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}