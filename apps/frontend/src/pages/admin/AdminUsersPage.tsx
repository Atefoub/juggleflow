import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi, type AdminSchoolClass, type AdminUser } from '../../api/adminApi';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import CreateUserModal from '../../components/admin/CreateUserModal';

type Role = 'Tous' | 'Enseignants' | 'Élèves';
type UserStatus = 'Actif' | 'Inactif';
type ConsentStatus = 'ok' | 'expired' | 'missing' | 'none';

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
  Admin:      '#5B20E6',
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState<Role>('Tous');
  const [search, setSearch]         = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [classes, setClasses] = useState<AdminSchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        // Les classes sont chargees en parallele pour pre-remplir le select
        // "Classe" de la modale de creation d'eleve.
        const [, cls] = await Promise.all([
          reloadUsers(),
          adminApi.getClasses().catch(() => [] as AdminSchoolClass[]),
        ]);
        if (!cancelled) setClasses(cls);
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

  // On regroupe missing + expired : les deux nécessitent une action côté DPO.
  const missingConsent = useMemo(
    () => users.filter((u) => u.consent === 'missing' || u.consent === 'expired'),
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
    <>
      <AdminPageHeader
        title="Utilisateurs"
        description="Comptes enseignants et élèves de l'établissement. Crée un nouveau compte en un clic ou importe en masse via Flyway."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="jf-admin-btn-primary"
          >
            + Créer un utilisateur
          </button>
        }
      />

      {/* Barre de filtre + recherche */}
      <div className="jf-admin-card p-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2 flex-wrap">
          {(['Tous', 'Enseignants', 'Élèves'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={
                roleFilter === r
                  ? 'jf-admin-btn-primary'
                  : 'jf-admin-btn-secondary'
              }
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-admin-border)] bg-[var(--color-admin-bg)] focus-within:border-[var(--color-admin)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-admin)_18%,transparent)]">
          <span role="img" aria-label="recherche" className="text-sm">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            className="flex-1 bg-transparent text-sm text-[var(--color-admin-text)] placeholder:text-[var(--color-admin-text-muted)] outline-none"
          />
        </div>
      </div>

      <CreateUserModal
        isOpen={showCreateModal}
        classes={classes}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          // Le compte est cree cote serveur : on rafraichit la liste pour le faire
          // apparaitre immediatement, et on garde la modale ouverte le temps que
          // l'admin copie le mot de passe genere (la modale gere son propre etat).
          reloadUsers().catch(() => undefined);
          setFeedback('Utilisateur créé.');
        }}
      />

      {feedback && (
        <div className="jf-admin-card p-3 mb-4 text-sm text-[var(--color-admin-text-secondary)]">
          {feedback}
        </div>
      )}

      {/* Alerte consentement manquant */}
      {missingConsent.length > 0 && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-lg border border-[color-mix(in_srgb,var(--color-admin-warning)_30%,transparent)] bg-[var(--color-admin-warning-bg)]">
          <span role="img" aria-label="attention" className="text-lg shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--color-admin-warning)] mb-0.5">
              {missingConsent.length} consentement{missingConsent.length > 1 ? 's' : ''} manquant{missingConsent.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-[var(--color-admin-text-secondary)]">
              Enregistre le consentement parental dans l&apos;onglet RGPD.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/rgpd')}
            className="jf-admin-btn-primary shrink-0"
          >
            Ouvrir RGPD
          </button>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-[var(--color-admin-text-muted)] text-center py-8">
          Chargement…
        </p>
      )}

      {!isLoading && error && (
        <p className="text-sm text-[var(--color-admin-danger)] text-center py-8">{error}</p>
      )}

      {!isLoading && !error && (
        <div className="jf-admin-card overflow-hidden">
          {filtered.map((u, i) => (
            <div
              key={u.id}
              className={`p-4 ${i < filtered.length - 1 ? 'border-b border-[var(--color-admin-border)]' : ''}`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: ROLE_COLORS[u.role] }}
                  aria-hidden
                >
                  {u.initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[var(--color-admin-text)] truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    {u.consent === 'ok' && (
                      <span className="jf-admin-chip jf-admin-chip-success">Consentement ✓</span>
                    )}
                    {u.consent === 'expired' && (
                      <span
                        className="jf-admin-chip"
                        style={{
                          color: 'var(--color-admin-warning)',
                          backgroundColor: 'var(--color-admin-warning-bg)',
                          border: '1px solid color-mix(in srgb, var(--color-admin-warning) 30%, transparent)',
                        }}
                        title="Politique de confidentialité obsolète — à renouveler dans l'onglet RGPD"
                      >
                        Expiré ⚠
                      </span>
                    )}
                    {u.consent === 'missing' && (
                      <span className="jf-admin-chip jf-admin-chip-danger">Consentement ✗</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-admin-text-muted)] mt-0.5">
                    {u.role} · {u.group} ·{' '}
                    <span
                      className={
                        u.status === 'Actif'
                          ? 'text-[var(--color-admin-success)] font-semibold'
                          : 'text-[var(--color-admin-danger)] font-semibold'
                      }
                    >
                      {u.status}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  {u.id !== currentUser?.id && (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => setEnabledForUser(u, u.status !== 'Actif')}
                      className={
                        u.status === 'Actif'
                          ? 'jf-admin-btn-danger'
                          : 'jf-admin-btn-secondary'
                      }
                    >
                      {busyId === u.id ? '…' : u.status === 'Actif' ? 'Désactiver' : 'Réactiver'}
                    </button>
                  )}
                  {u.role === 'Élève' && (u.consent === 'missing' || u.consent === 'expired') && (
                    <button
                      type="button"
                      onClick={() => navigate('/admin/rgpd')}
                      className="jf-admin-btn-primary"
                    >
                      RGPD
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-[var(--color-admin-text-muted)] text-center py-8">
              Aucun utilisateur trouvé.
            </p>
          )}
        </div>
      )}
    </>
  );
}
