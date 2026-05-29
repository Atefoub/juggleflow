import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../api/authApi';
import { studentOnboardingApi } from '../../api/studentOnboardingApi';
import {
  applyProfileOnboarding,
  completeOnboarding,
  getOnboardingLevel,
  ONBOARDING_LEVEL_OPTIONS,
  type OnboardingLevel,
} from '../../utils/onboarding';
import { useAuth } from '../../context/AuthContext';
import AppIcon from '../../components/icons/AppIcon';
import { ONBOARDING_LEVEL_ICON } from '../../components/icons/iconRegistry';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initial = useMemo<OnboardingLevel>(() => {
    return getOnboardingLevel(user?.id) ?? 'BEGINNER';
  }, [user?.id]);
  const [selected, setSelected] = useState<OnboardingLevel>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 bg-bg-primary font-body">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-4xl mb-4">
          <AppIcon name="juggler" size={40} label="Jongleur" />
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
          Bienvenue sur JuggleFlow !
        </h1>
        <p className="text-text-secondary text-sm">
          Une seule question avant de commencer.
        </p>
      </div>

      {/* Question */}
      <h2 className="font-display text-lg font-bold text-text-primary mb-2">
        Quel est ton niveau en jonglage ?
      </h2>
      <p className="mb-6 text-sm text-text-secondary">
        Ton parcours sera adapté en fonction de ta réponse.
      </p>

      {/* Choix */}
      <div className="flex flex-col gap-4 mb-8">
        {ONBOARDING_LEVEL_OPTIONS.map((level) => {
          const isSelected = selected === level.value;
          return (
            <button
              key={level.value}
              onClick={() => setSelected(level.value)}
              className={[
                'flex items-center gap-4 p-4 rounded-2xl text-left transition-all min-h-18',
                isSelected
                  ? 'bg-accent-surface border-2 border-brand'
                  : 'bg-bg-card border-2 border-border',
              ].join(' ')}
            >
              <div
                className={[
                  'flex items-center justify-center w-11 h-11 rounded-xl shrink-0 text-xl',
                  isSelected ? 'jf-nav-pill-active' : 'bg-border',
                ].join(' ')}
              >
                <AppIcon
                  name={ONBOARDING_LEVEL_ICON[level.value]}
                  size={24}
                  label={level.label}
                />
              </div>
              <div className="flex-1">
                <div className={`font-bold text-sm mb-1 ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {level.label}
                </div>
                <div className="text-xs text-text-muted">{level.description}</div>
              </div>
              <div
                className={[
                  'w-5 h-5 rounded-full shrink-0 border-2',
                  isSelected ? 'border-transparent jf-nav-pill-active' : 'border-text-muted bg-transparent',
                ].join(' ')}
              />
            </button>
          );
        })}
      </div>

      {/* Note rassurante */}
      <div className="p-4 rounded-xl mb-10 text-xs leading-relaxed bg-bg-card text-text-muted">
        Ton niveau sera ajusté automatiquement au fil de ta progression.
        Tu pourras le modifier à tout moment dans ton profil.
      </div>

      {error && (
        <p className="text-xs text-alert text-center mb-3">{error}</p>
      )}

      {/* CTA */}
      <button
        onClick={async () => {
          if (!user?.id) return;
          setSubmitting(true);
          setError(null);
          try {
            const profile = await studentOnboardingApi.complete(selected);
            completeOnboarding(selected, user.id);
            applyProfileOnboarding(profile);
            await login(getAccessToken() ?? '', profile);
            navigate('/student/dashboard', { replace: true });
          } catch {
            completeOnboarding(selected, user.id);
            navigate('/student/dashboard', { replace: true });
          } finally {
            setSubmitting(false);
          }
        }}
        disabled={!user?.id || submitting}
        className="jf-btn-primary w-full rounded-xl text-sm mt-auto min-h-12 disabled:opacity-60"
      >
        {submitting ? 'Enregistrement…' : "C'est parti →"}
      </button>
    </div>
  );
}