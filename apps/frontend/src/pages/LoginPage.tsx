import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormData = z.infer<typeof schema>;
type RoleOption = 'ROLE_ELEVE' | 'ROLE_ENSEIGNANT' | 'ROLE_ADMINISTRATEUR';

const roles: { value: RoleOption; label: string }[] = [
  { value: 'ROLE_ELEVE',          label: 'Élève' },
  { value: 'ROLE_ENSEIGNANT',     label: 'Enseignant' },
  { value: 'ROLE_ADMINISTRATEUR', label: 'Admin' },
];

const roleRedirect: Record<RoleOption, string> = {
  ROLE_ELEVE:           '/student/dashboard',
  ROLE_ENSEIGNANT:      '/teacher/dashboard',
  ROLE_ADMINISTRATEUR:  '/admin/dashboard',
};

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<RoleOption>('ROLE_ELEVE');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      await login(response.accessToken);
      navigate(roleRedirect[response.role], { replace: true });
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#0A0E2A', fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="w-full" style={{ maxWidth: '400px' }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo1.png"
            alt="JuggleFlow"
            style={{
              width: '280px',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
              mixBlendMode: 'screen',
            }}
          />
          <p style={{ color: '#A0AABF', fontSize: '0.85rem', marginTop: '8px' }}>
            Plateforme pédagogique de jonglage
          </p>

</div>
        {/* Sélecteur de rôle */}
        <div className="mb-6">
          <p
            className="mb-2 text-xs font-bold uppercase tracking-widest"
            style={{ color: '#5A6480' }}
          >
            Je suis :
          </p>
          <div className="flex gap-2">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor:
                    selectedRole === role.value ? '#8B2BE2' : '#111638',
                  color:
                    selectedRole === role.value ? '#FFFFFF' : '#A0AABF',
                  border: `1.5px solid ${selectedRole === role.value ? '#8B2BE2' : '#1E2847'}`,
                  minHeight: '44px',
                }}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

          {/* Email */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: '#FFFFFF' }}
            >
              Adresse e-mail institutionnelle
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="prenom.nom@ecole.fr"
              className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all"
              style={{
                backgroundColor: '#111638',
                border: `1.5px solid ${errors.email ? '#FF4D4D' : '#1E2847'}`,
                color: '#FFFFFF',
                minHeight: '48px',
              }}
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: '#FF4D4D' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: '#FFFFFF' }}
            >
              Mot de passe
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl outline-none text-sm"
              style={{
                backgroundColor: '#111638',
                border: `1.5px solid ${errors.password ? '#FF4D4D' : '#1E2847'}`,
                color: '#FFFFFF',
                minHeight: '48px',
              }}
            />
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: '#FF4D4D' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Lien mot de passe oublié */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm underline"
              style={{ color: '#A0AABF' }}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Erreur globale */}
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm text-center"
              style={{ backgroundColor: '#2A1020', color: '#FF4D4D', border: '1px solid #FF4D4D' }}
            >
              {error}
            </div>
          )}

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity"
            style={{
              backgroundColor: '#FF7A00',
              minHeight: '48px',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Connexion...' : 'Se connecter →'}
          </button>

          {/* Séparateur */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: '#1E2847' }} />
            <span className="text-xs" style={{ color: '#5A6480' }}>ou</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#1E2847' }} />
          </div>

          {/* ENT */}
          <button
            type="button"
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{
              backgroundColor: 'transparent',
              border: '1.5px solid #1E2847',
              color: '#A0AABF',
              minHeight: '48px',
            }}
          >
            Connexion via ENT de l'établissement
          </button>
        </form>

        {/* Notice RGPD */}
        <div
          className="mt-6 p-4 rounded-xl text-center text-xs leading-relaxed"
          style={{ backgroundColor: '#111638', color: '#5A6480' }}
        >
          <strong style={{ color: '#A0AABF' }}>
            Accès réservé aux établissements partenaires.
          </strong>
          <br />
          Contact : contact@juggleflow.fr
        </div>
      </div>
    </div>
  );
}