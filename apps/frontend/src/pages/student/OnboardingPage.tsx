import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  completeOnboarding,
  getOnboardingLevel,
  type OnboardingLevel,
} from '../../utils/onboarding';
import { useAuth } from '../../context/AuthContext';

const levels: {
  value: OnboardingLevel;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'BEGINNER',
    label: 'Débutant',
    icon: '🌱',
    description: "Je n'ai jamais jonglé ou je commence tout juste",
  },
  {
    value: 'INTERMEDIATE',
    label: 'Intermédiaire',
    icon: '⚡',
    description: 'Je maîtrise les 3 balles et quelques figures de base',
  },
  {
    value: 'ADVANCED',
    label: 'Avancé',
    icon: '🔥',
    description: 'Je pratique régulièrement des figures complexes',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initial = useMemo<OnboardingLevel>(() => {
    return getOnboardingLevel(user?.id) ?? 'BEGINNER';
  }, [user?.id]);
  const [selected, setSelected] = useState<OnboardingLevel>(initial);

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 bg-bg-primary font-body">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-4xl mb-4">
          <span role="img" aria-label="jongleur">🤹</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-white mb-2">
          Bienvenue sur JuggleFlow !
        </h1>
        <p className="text-text-secondary text-sm">
          Une seule question avant de commencer.
        </p>
      </div>

      {/* Question */}
      <h2 className="font-display text-lg font-bold text-white mb-2">
        Quel est ton niveau en jonglage ?
      </h2>
      <p className="mb-6 text-sm text-text-secondary">
        Ton parcours sera adapté en fonction de ta réponse.
      </p>

      {/* Choix */}
      <div className="flex flex-col gap-4 mb-8">
        {levels.map((level) => {
          const isSelected = selected === level.value;
          return (
            <button
              key={level.value}
              onClick={() => setSelected(level.value)}
              className={[
                'flex items-center gap-4 p-4 rounded-2xl text-left transition-all min-h-18',
                isSelected
                  ? 'bg-[#1A0E2E] border-2 border-brand'
                  : 'bg-bg-card border-2 border-border',
              ].join(' ')}
            >
              <div
                className={[
                  'flex items-center justify-center w-11 h-11 rounded-xl shrink-0 text-xl',
                  isSelected ? 'bg-brand' : 'bg-border',
                ].join(' ')}
              >
                <span role="img" aria-label={level.label}>{level.icon}</span>
              </div>
              <div className="flex-1">
                <div className={`font-bold text-sm mb-1 ${isSelected ? 'text-white' : 'text-text-secondary'}`}>
                  {level.label}
                </div>
                <div className="text-xs text-text-muted">{level.description}</div>
              </div>
              <div
                className={[
                  'w-5 h-5 rounded-full shrink-0 border-2',
                  isSelected ? 'border-brand bg-brand' : 'border-text-muted bg-transparent',
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

      {/* CTA */}
      <button
        onClick={() => {
          if (!user?.id) return;
          completeOnboarding(selected, user?.id);
          navigate('/student/dashboard', { replace: true });
        }}
        disabled={!user?.id}
        className="w-full py-3 rounded-xl font-bold text-white text-sm mt-auto min-h-12 bg-cta disabled:opacity-60"
      >
        C'est parti →
      </button>
    </div>
  );
}