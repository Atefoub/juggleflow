import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState<Role>('Tous');
  const [search, setSearch]         = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reloadUsers = useCallback(async () => {
    const apiUsers = await adminApi.getUsers();
    setUsers(apiUsers.map(toAppUser));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await reloadUsers();
      } catch {
        if (!cancelled) setError('Impossible de charger les utilisateurs.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [reloadUsers]);

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

  async function setEnabledForUser(target: AppUser, enabled: boolean) {
    if (!currentUser) return;
    if (!enabled && target.id === currentUser.id) {
      setFeedback('Tu ne peux pas désactiver ton propre compte ici.');
      return;
    }
    const verb = enabled ? 'réactiver' : 'désactiver';
    if (!enabled && !window.confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} le compte de ${target.firstName} ${target.lastName} ?`)) {
      return;
    }
    setBusyId(target.id);
    setFeedback(null);
    try {
      await adminApi.setUserEnabled(target.id, enabled);
      await reloadUsers();
      setFeedback(enabled ? 'Compte réactivé.' : 'Compte désactivé.');
    } catch {
      setFeedback('Action refusée ou erreur réseau (ex. dernier administrateur actif).');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display font-bold text-text-primary text-2xl">Utilisateurs</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg bg-border text-text-secondary min-h-9"
            >
              Quitter
            </button>
          </div>
        </div>
        <p className="text-xs text-text-muted mb-2">
          Nouveaux comptes : inscription publique (<code className="text-text-secondary">/api/auth/register</code>) ou import SQL / migration Flyway.
        </p>

        {/* Role filter */}
        <div className="flex gap-2 mb-3">
          {(['Tous', 'Enseignants', 'Élèves'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
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

        {feedback && (
          <p className="text-xs text-center text-text-secondary bg-bg-card border border-border rounded-xl px-3 py-2">
            {feedback}
          </p>
        )}

        {/* Missing consent alert */}
        {missingConsent.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#1A1020] border border-cta/40">
            <span role="img" aria-label="attention" className="text-lg shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary mb-0.5">
                {missingConsent.length} consentement{missingConsent.length > 1 ? 's' : ''} manquant{missingConsent.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-text-secondary">Enregistre le consentement parental dans l’onglet RGPD.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/rgpd')}
              className="text-xs px-2 py-1.5 rounded-lg bg-cta/20 border border-cta/40 text-cta font-semibold shrink-0"
            >
              Ouvrir RGPD
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
            {filtered.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-bg-card border border-border">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: ROLE_COLORS[u.role] }}
                  >
                    {u.initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-text-primary">
                        {u.firstName} {u.lastName}
                      </p>
                      {u.consent === 'ok' && (
                        <span className="text-xs text-success">Consentement ✓</span>
                      )}
                      {u.consent === 'missing' && (
                        <span className="text-xs text-alert">Consentement ✗</span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      {u.role} · {u.group} ·{' '}
                      <span className={u.status === 'Actif' ? 'text-success' : 'text-alert'}>
                        {u.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {u.id !== currentUser?.id && (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => setEnabledForUser(u, u.status !== 'Actif')}
                      className={[
                        'flex-1 min-w-[8rem] py-1.5 rounded-lg text-xs font-semibold min-h-8 border transition-opacity',
                        u.status === 'Actif'
                          ? 'text-alert border-alert/40 bg-alert/10'
                          : 'text-success border-success/40 bg-success/10',
                      ].join(' ')}
                    >
                      {busyId === u.id ? '…' : u.status === 'Actif' ? 'Désactiver le compte' : 'Réactiver le compte'}
                    </button>
                  )}
                  {u.role === 'Élève' && u.consent === 'missing' && (
                    <button
                      type="button"
                      onClick={() => navigate('/admin/rgpd')}
                      className="flex-1 min-w-[8rem] py-1.5 rounded-lg text-xs font-semibold text-cta border border-cta/40 bg-cta/10 min-h-8"
                    >
                      RGPD — consentement
                    </button>
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
