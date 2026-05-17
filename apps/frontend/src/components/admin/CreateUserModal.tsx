import { useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  type AdminCreateUserPayload,
  type AdminCreateUserResponse,
  type AdminSchoolClass,
} from '../../api/adminApi';

type Role = 'ROLE_ELEVE' | 'ROLE_ENSEIGNANT' | 'ROLE_ADMINISTRATEUR';

interface Props {
  isOpen: boolean;
  classes: AdminSchoolClass[];
  onClose: () => void;
  /** Notifie le parent qu'un utilisateur a ete cree (pour rafraichir la liste). */
  onCreated: (created: AdminCreateUserResponse) => void;
}

/**
 * Modale de creation d'utilisateur depuis l'admin.
 *
 * Deux phases :
 * 1. Formulaire (email, prenom, nom, role, classe si eleve, mot de passe optionnel).
 * 2. Ecran de succes avec le mot de passe genere si le serveur en a produit un.
 *    Ce mot de passe n'est jamais persiste cote client : l'admin doit le copier
 *    et le transmettre a l'utilisateur final, puis fermer la modale.
 */
export default function CreateUserModal({ isOpen, classes, onClose, onCreated }: Props) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('ROLE_ELEVE');
  const [classId, setClassId] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [usePasswordField, setUsePasswordField] = useState(false);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<AdminCreateUserResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset complet a chaque ouverture pour eviter de re-soumettre par accident
  // les valeurs d'une creation precedente.
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('ROLE_ELEVE');
      setClassId('');
      setPassword('');
      setUsePasswordField(false);
      setBusy(false);
      setFormError(null);
      setCreatedUser(null);
      setCopied(false);
    }
  }, [isOpen]);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!email.trim() || !firstName.trim() || !lastName.trim()) return false;
    if (usePasswordField && password.length > 0 && password.length < 8) return false;
    return true;
  }, [busy, email, firstName, lastName, usePasswordField, password]);

  if (!isOpen) return null;

  async function submit() {
    setBusy(true);
    setFormError(null);
    try {
      const payload: AdminCreateUserPayload = {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      };
      if (role === 'ROLE_ELEVE' && classId !== '') {
        payload.classId = classId;
      }
      if (usePasswordField && password.trim() !== '') {
        payload.password = password;
      }

      const res = await adminApi.createUser(payload);
      setCreatedUser(res);
      onCreated(res);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? // axios error
            (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message ?? 'Création impossible.'
          : 'Création impossible.';
      setFormError(message);
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword() {
    if (!createdUser?.generatedPassword) return;
    try {
      await navigator.clipboard.writeText(createdUser.generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Pas de clipboard API dispo (navigateur ancien) → on laisse l'admin selectionner manuellement.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="min-h-full grid place-items-center p-4">
        <div
          className="jf-admin-card w-full max-w-[30rem] p-5 shadow-xl"
          role="dialog"
          aria-labelledby="create-user-title"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Phase 2 — confirmation + password généré */}
          {createdUser && (
            <>
              <h2
                id="create-user-title"
                className="font-display font-bold text-[var(--color-admin-text)] text-lg mb-3"
              >
                Compte créé
              </h2>
              <p className="text-sm text-[var(--color-admin-text-secondary)] mb-3">
                <strong>{createdUser.firstName} {createdUser.lastName}</strong> ·{' '}
                <span className="text-[var(--color-admin-text-muted)]">{createdUser.email}</span>
              </p>

              {createdUser.generatedPassword ? (
                <div className="mb-4 p-3 rounded-lg border border-[color-mix(in_srgb,var(--color-admin-warning)_30%,transparent)] bg-[var(--color-admin-warning-bg)]">
                  <p className="text-xs text-[var(--color-admin-warning)] font-bold mb-1">
                    Mot de passe temporaire — affiché une seule fois
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm text-[var(--color-admin-text)] bg-white border border-[var(--color-admin-border)] rounded px-2 py-1 break-all">
                      {createdUser.generatedPassword}
                    </code>
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="jf-admin-btn-primary text-xs"
                    >
                      {copied ? 'Copié ✓' : 'Copier'}
                    </button>
                  </div>
                  <p className="text-[0.65rem] text-[var(--color-admin-text-muted)] mt-2">
                    Transmets-le à l&apos;utilisateur via un canal sûr (mail, SMS) avant de fermer.
                    L&apos;admin pourra le réinitialiser plus tard mais ne le reverra plus ici.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-admin-text-muted)] mb-4">
                  Mot de passe fourni par l&apos;admin — non rappelé ici par sécurité.
                </p>
              )}

              <div className="flex justify-end">
                <button type="button" onClick={onClose} className="jf-admin-btn-primary">
                  Fermer
                </button>
              </div>
            </>
          )}

          {/* Phase 1 — formulaire */}
          {!createdUser && (
            <>
              <h2
                id="create-user-title"
                className="font-display font-bold text-[var(--color-admin-text)] text-lg mb-4"
              >
                Nouvel utilisateur
              </h2>

              {formError && (
                <p className="text-sm text-[var(--color-admin-danger)] mb-3">{formError}</p>
              )}

              <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cu-email">
                Email
              </label>
              <input
                id="cu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="jf-admin-input mb-3"
                autoComplete="off"
              />

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cu-firstName">
                    Prénom
                  </label>
                  <input
                    id="cu-firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="jf-admin-input"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cu-lastName">
                    Nom
                  </label>
                  <input
                    id="cu-lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="jf-admin-input"
                    autoComplete="off"
                  />
                </div>
              </div>

              <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cu-role">
                Rôle
              </label>
              <select
                id="cu-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="jf-admin-input mb-3"
              >
                <option value="ROLE_ELEVE">Élève</option>
                <option value="ROLE_ENSEIGNANT">Enseignant</option>
                <option value="ROLE_ADMINISTRATEUR">Administrateur</option>
              </select>

              {role === 'ROLE_ELEVE' && (
                <>
                  <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cu-class">
                    Classe (optionnel)
                  </label>
                  <select
                    id="cu-class"
                    value={classId === '' ? '' : String(classId)}
                    onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
                    className="jf-admin-input mb-3"
                  >
                    <option value="">— Sans classe —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.schoolYear})
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label className="flex items-center gap-2 text-xs text-[var(--color-admin-text-secondary)] mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePasswordField}
                  onChange={(e) => setUsePasswordField(e.target.checked)}
                />
                <span>Définir un mot de passe manuellement</span>
              </label>

              {usePasswordField && (
                <>
                  <label className="block text-xs text-[var(--color-admin-text-muted)] mb-1" htmlFor="cu-password">
                    Mot de passe (8 caractères minimum)
                  </label>
                  <input
                    id="cu-password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="jf-admin-input mb-3"
                    autoComplete="new-password"
                    minLength={8}
                  />
                </>
              )}

              {!usePasswordField && (
                <p className="text-[0.7rem] text-[var(--color-admin-text-muted)] mb-3 leading-relaxed">
                  Sinon, le serveur générera un mot de passe temporaire fort que tu pourras copier après la création.
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button type="button" disabled={busy} onClick={onClose} className="jf-admin-btn-secondary">
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={submit}
                  className="jf-admin-btn-primary"
                >
                  {busy ? '…' : 'Créer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
