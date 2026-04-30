import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeOnboarding, type OnboardingLevel } from '../../utils/onboarding';
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
  const [selected, setSelected] = useState<OnboardingLevel>('BEGINNER');
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col px-6 py-10"
      style={{ backgroundColor: '#0A0E2A', fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-4xl mb-4">🤹</div>
        <h1
          className="text-2xl font-bold text-white mb-2"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Bienvenue sur JuggleFlow !
        </h1>
        <p style={{ color: '#A0AABF', fontSize: '0.85rem' }}>
          Une seule question avant de commencer.
        </p>
      </div>

      {/* Question */}
      <h2
        className="text-lg font-bold text-white mb-2"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Quel est ton niveau en jonglage ?
      </h2>
      <p className="mb-6 text-sm" style={{ color: '#A0AABF' }}>
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
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{
                backgroundColor: isSelected ? '#1A0E2E' : '#111638',
                border: `2px solid ${isSelected ? '#8B2BE2' : '#1E2847'}`,
                minHeight: '72px',
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: isSelected ? '#8B2BE2' : '#1E2847',
                  fontSize: '1.3rem',
                }}
              >
                {level.icon}
              </div>
              <div className="flex-1">
                <div
                  className="font-bold text-sm mb-1"
                  style={{ color: isSelected ? '#FFFFFF' : '#A0AABF' }}
                >
                  {level.label}
                </div>
                <div className="text-xs" style={{ color: '#5A6480' }}>
                  {level.description}
                </div>
              </div>
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: '20px',
                  height: '20px',
                  border: `2px solid ${isSelected ? '#8B2BE2' : '#5A6480'}`,
                  backgroundColor: isSelected ? '#8B2BE2' : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Note rassurante */}
      <div
        className="p-4 rounded-xl mb-10 text-xs leading-relaxed"
        style={{ backgroundColor: '#111638', color: '#5A6480' }}
      >
        Ton niveau sera ajusté automatiquement au fil de ta progression.
        Tu pourras le modifier à tout moment dans ton profil.
      </div>

      {/* CTA */}
      <button
        onClick={() => {
          completeOnboarding(selected, user?.id);
          navigate('/student/dashboard', { replace: true });
        }}
        className="w-full py-3 rounded-xl font-bold text-white text-sm mt-auto"
        style={{ backgroundColor: '#FF7A00', minHeight: '48px' }}
      >
        C'est parti →
      </button>
    </div>
  );
}
