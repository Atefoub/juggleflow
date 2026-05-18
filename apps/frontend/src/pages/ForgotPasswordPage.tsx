import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../api/authApi';

const schema = z.object({
  email: z.string().email('Email invalide'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await authApi.requestPasswordReset(data.email);
      setMessage(res.message);
      setSubmitted(true);
    } catch {
      setError('Impossible d\'envoyer la demande. Réessaie plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-bg-primary font-body">
      <div className="w-full max-w-100">
        <div className="text-center mb-8">
          <img
            src="/logo1.png"
            alt="JuggleFlow"
            className="w-70 h-auto object-contain block mx-auto"
            style={{ mixBlendMode: 'screen' }}
          />
          <h1 className="font-display text-xl font-bold text-text-primary mt-4">
            Mot de passe oublié
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Saisis l&apos;adresse e-mail fournie par ton établissement.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 rounded-xl text-sm text-center bg-bg-card border border-border text-text-secondary leading-relaxed">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-text-primary">
                Adresse e-mail institutionnelle
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="prenom.nom@ecole.fr"
                className={[
                  'w-full px-4 py-3 rounded-xl outline-none text-sm min-h-12',
                  'bg-bg-input text-text-primary',
                  errors.email ? 'border-[1.5px] border-alert' : 'border-[1.5px] border-border',
                ].join(' ')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-alert">{errors.email.message}</p>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-center bg-[#2A1020] text-alert border border-alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={[
                'jf-btn-primary w-full min-h-12 py-3 rounded-xl text-sm',
                isLoading ? 'opacity-70' : 'opacity-100',
              ].join(' ')}
            >
              {isLoading ? 'Envoi…' : 'Envoyer la demande →'}
            </button>
          </form>
        )}

        <p className="text-center mt-6">
          <Link
            to="/login"
            className="text-sm text-text-secondary hover:text-text-primary underline"
          >
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
