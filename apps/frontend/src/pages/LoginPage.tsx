import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { isOnboardingCompleted } from '../utils/onboarding';
import type { Role } from '../types/auth';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type FormData = z.infer<typeof schema>;

const roleRedirect: Record<Role, string> = {
  ROLE_ELEVE:           '/student/dashboard',
  ROLE_ENSEIGNANT:      '/teacher/dashboard',
  ROLE_ADMINISTRATEUR:  '/admin/dashboard',
};

export default function LoginPage() {
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
      const profile = await login(response.accessToken);
      if (profile.role === 'ROLE_ELEVE' && !isOnboardingCompleted(profile.id)) {
        navigate('/onboarding', { replace: true });
      } else {
        const redirect = roleRedirect[profile.role] ?? '/login';
        navigate(redirect, { replace: true });
      }
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-bg-primary font-body">
      <div className="w-full max-w-100">

        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/logo1.png"
            alt="JuggleFlow"
            className="w-70 h-auto object-contain block mx-auto"
            style={{ mixBlendMode: 'screen' }}
          />
          <p className="text-text-secondary text-sm mt-2">
            Plateforme pédagogique de jonglage
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-text-primary">
              Adresse e-mail institutionnelle
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="prenom.nom@ecole.fr"
              className={[
                'w-full px-4 py-3 rounded-xl outline-none text-sm transition-all min-h-12',
                'bg-bg-input text-text-primary',
                errors.email ? 'border-[1.5px] border-alert' : 'border-[1.5px] border-border',
              ].join(' ')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-alert">{errors.email.message}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-text-primary">
              Mot de passe
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className={[
                'w-full px-4 py-3 rounded-xl outline-none text-sm min-h-12',
                'bg-bg-input text-text-primary',
                errors.password ? 'border-[1.5px] border-alert' : 'border-[1.5px] border-border',
              ].join(' ')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-alert">{errors.password.message}</p>
            )}
          </div>

          {/* Lien mot de passe oublié */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm underline text-text-secondary"
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Erreur globale */}
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm text-center bg-[#2A1020] text-alert border border-alert">
              {error}
            </div>
          )}

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={isLoading}
            className={[
              'jf-btn-primary w-full min-h-12 py-3 rounded-xl text-sm',
              isLoading ? 'opacity-70' : 'opacity-100',
            ].join(' ')}
          >
            {isLoading ? 'Connexion...' : 'Se connecter →'}
          </button>

          {/* Séparateur */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ENT */}
          <button
            type="button"
            className="jf-btn-outline w-full min-h-12 py-3 rounded-xl"
          >
            Connexion via ENT de l'établissement
          </button>
        </form>

        {/* Notice RGPD */}
        <div className="mt-6 p-4 rounded-xl text-center text-xs leading-relaxed bg-bg-input text-text-muted">
          <strong className="text-text-secondary">
            Accès réservé aux établissements partenaires.
          </strong>
          <br />
          Contact : contact@juggleflow.fr
        </div>
      </div>
    </div>
  );
}