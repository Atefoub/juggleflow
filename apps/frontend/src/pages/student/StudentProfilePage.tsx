import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { studentApi, type StudentStats, type LearningPath } from '../../api/studentApi';
import { getOnboardingLevel, setOnboardingLevel, type OnboardingLevel } from '../../utils/onboarding';
import { getOfflineMode, setOfflineMode } from '../../utils/preferences';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import OfflineBanner from '../../components/OfflineBanner';
import PwaInstallPrompt from '../../components/PwaInstallPrompt';
import { prefetchOfflineCatalogue } from '../../utils/prefetchOfflineCatalogue';

const navItems = [
  { label: 'Accueil',     icon: '🏠', path: '/student/dashboard' },
  { label: 'Catalogue',   icon: '🎯', path: '/student/catalogue' },
  { label: 'Progression', icon: '📊', path: '/student/progression' },
  { label: 'Profil',      icon: '👤', path: '/student/profil' },
];

const XP_PER_TRICK = 100;
const XP_MAX = 500;

export default function StudentProfilePage() {
  const { user, logout } = useAuth();
  const isOnline = useOnlineStatus();

  const [stats, setStats]       = useState<StudentStats | null>(null);
  const [paths, setPaths]       = useState<LearningPath[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [notificationsOn, setNotificationsOn] = useState(true);
  const [darkMode, setDarkMode]               = useState(true);
  const [offlineMode, setOfflineModeState]    = useState(() => getOfflineMode(user?.id));
  const [offlinePrefetching, setOfflinePrefetching] = useState(false);
  const [offlineHint, setOfflineHint]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      studentApi.getStatistics(),
      studentApi.getMyLearningPaths(),
    ])
      .then(([s, p]) => {
        setStats(s);
        setPaths(p);
      })
      .catch(() => setError('Impossible de charger les données du profil.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setOfflineModeState(getOfflineMode(user?.id));
  }, [user?.id]);

  async function enableOfflineMode() {
    setOfflineHint(null);
    setOfflinePrefetching(true);
    try {
      if (!isOnline) {
        setOfflineHint('Connecte-toi pour précharger le catalogue, puis réactive le mode hors-ligne.');
        return;
      }

      const { listPages, trickDetails, totalTricksStored } = await prefetchOfflineCatalogue();

      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready.catch(() => null);
      }
      setOfflineHint(
        `Catalogue prêt hors-ligne : ${totalTricksStored} figures (${listPages} pages, ${trickDetails} fiches détaillées).`,
      );
    } finally {
      setOfflinePrefetching(false);
    }
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  const onboardingLevel = getOnboardingLevel(user?.id) ?? 'BEGINNER';
  const LEVEL_LABEL: Record<OnboardingLevel, string> = {
    BEGINNER: 'Débutant',
    INTERMEDIATE: 'Intermédiaire',
    ADVANCED: 'Avancé',
  };

  const xp          = (stats?.totalTricksLearned ?? 0) * XP_PER_TRICK;
  const xpPercent   = Math.min((xp / XP_MAX) * 100, 100);
  const xpDisplay   = Math.min(xp, XP_MAX);
  const currentPath = paths[0] ?? null;

  const pathProgressPercent = currentPath && currentPath.stepCount > 0
    ? Math.round(((stats?.totalTricksLearned ?? 0) / currentPath.stepCount) * 100)
    : 0;

  // Estimation du temps total en heures (fictif mais calculé)
  const totalMinutes = (stats?.totalTricksLearned ?? 0) * 15;
  const totalTimeLabel = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`
    : `${totalMinutes}min`;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-6 bg-[#0D1235] border-b border-border flex flex-col items-center gap-3">
        <div className="flex items-center justify-center w-20 h-20 rounded-full font-bold text-2xl text-text-primary bg-linear-to-br from-brand to-brand-end">
          {initials}
        </div>

        <div className="text-center">
          <p className="font-display font-bold text-text-primary text-lg">
            {user ? `${user.firstName} ${user.lastName}` : '—'}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            Élève · {LEVEL_LABEL[onboardingLevel]} {currentPath ? `· ${currentPath.pathName}` : ''}
          </p>
        </div>

        {/* XP badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-card border border-border">
          <span role="img" aria-label="XP" className="text-sm">⭐</span>
          <span className="text-sm font-bold text-text-primary">{xpDisplay} XP</span>
          <span className="text-xs text-text-muted">· Bronze</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {/* Stats */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Mes statistiques
          </h2>

          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse bg-bg-card" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: stats?.totalTricksLearned ?? 0, label: 'Figures\napprises', icon: '✅', iconLabel: 'figures apprises' },
                { value: totalTimeLabel,                  label: 'Temps\nestimé',     icon: '⏱️', iconLabel: 'temps estimé'     },
                { value: stats?.badgesEarned ?? 0,        label: 'Badges\nobtenus',   icon: '🏅', iconLabel: 'badges obtenus'   },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
                >
                  <span role="img" aria-label={stat.iconLabel} className="text-lg">{stat.icon}</span>
                  <span className="font-display text-xl font-bold text-text-primary leading-tight">
                    {stat.value}
                  </span>
                  <span className="text-[0.6rem] text-text-muted whitespace-pre-line leading-tight">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* XP Progress */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Progression XP
          </h2>
          <div className="p-4 rounded-2xl bg-bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-text-muted mb-0.5">Rang actuel</p>
                <p className="font-display font-bold text-text-primary text-base">🥉 Bronze</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted mb-0.5">Points XP</p>
                <p className="font-display font-bold text-brand text-base">{xpDisplay} / {XP_MAX}</p>
              </div>
            </div>
            <ProgressBar value={xpPercent} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="8px" />
            <p className="text-xs text-text-muted mt-1">
              {Math.max(0, XP_MAX - xpDisplay)} XP pour atteindre le rang Argent
            </p>
          </div>
        </section>

        {/* Assigned path */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Parcours assigné
          </h2>
          {loading ? (
            <div className="h-20 rounded-2xl animate-pulse bg-bg-card" />
          ) : currentPath ? (
            <div className="p-4 rounded-2xl bg-bg-card border border-border">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-text-primary text-sm">{currentPath.pathName}</p>
                {currentPath.targetLevel && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-border text-text-secondary">
                    {currentPath.targetLevel}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mb-2">
                {currentPath.stepCount} figure{currentPath.stepCount > 1 ? 's' : ''} · {currentPath.estimatedDurationDays ?? '?'} jours
              </p>
              <div className="flex justify-between mb-2">
                <span className="text-xs text-text-muted">Progression</span>
                <span className="text-xs text-text-secondary font-bold">{pathProgressPercent}%</span>
              </div>
              <ProgressBar value={pathProgressPercent} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="8px" />
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-bg-card border border-border text-xs text-text-muted">
              Aucun parcours assigné pour l'instant.
            </div>
          )}
        </section>

        {/* Preferences */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Préférences
          </h2>
          <div className="rounded-2xl overflow-hidden border border-border divide-y divide-border">

            {/* Niveau (wireframes: modifiable) */}
            <div className="p-4 bg-bg-card">
              <div className="flex items-center gap-3 mb-3">
                <span role="img" aria-label="niveau" className="text-lg">⭐</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Niveau</p>
                  <p className="text-xs text-text-muted">Ajuste ton parcours et les recommandations</p>
                </div>
              </div>
              <div role="group" aria-label="Choisir mon niveau" className="flex gap-2">
                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as OnboardingLevel[]).map((lvl) => {
                  const active = onboardingLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => user?.id && setOnboardingLevel(lvl, user.id)}
                      className={[
                        'px-3 py-2 rounded-xl text-xs font-semibold border min-h-10',
                        active
                          ? 'bg-linear-to-br from-brand to-brand-end border-brand text-white'
                          : 'bg-bg-primary border-border text-text-muted',
                      ].join(' ')}
                    >
                      {LEVEL_LABEL[lvl]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between p-4 bg-bg-card">
              <div className="flex items-center gap-3">
                <span role="img" aria-label="notifications" className="text-lg">🔔</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Notifications</p>
                  <p className="text-xs text-text-muted">Rappels d'entraînement</p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsOn((v) => !v)}
                aria-label={notificationsOn ? 'Désactiver les notifications' : 'Activer les notifications'}
                className={[
                  'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
                  notificationsOn ? 'bg-linear-to-br from-brand to-brand-end' : 'bg-border',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                    notificationsOn ? 'translate-x-5' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </button>
            </div>

            {/* Dark mode */}
            <div className="flex items-center justify-between p-4 bg-bg-card">
              <div className="flex items-center gap-3">
                <span role="img" aria-label="mode foncé" className="text-lg">🌙</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Mode foncé</p>
                  <p className="text-xs text-text-muted">Thème sombre actif</p>
                </div>
              </div>
              <button
                onClick={() => setDarkMode((v) => !v)}
                aria-label={darkMode ? 'Désactiver le mode foncé' : 'Activer le mode foncé'}
                className={[
                  'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
                  darkMode ? 'bg-linear-to-br from-brand to-brand-end' : 'bg-border',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                    darkMode ? 'translate-x-5' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </button>
            </div>

            {/* Offline mode (wireframes) */}
            <div className="flex items-center justify-between p-4 bg-bg-card">
              <div className="flex items-center gap-3">
                <span role="img" aria-label="mode hors-ligne" className="text-lg">📴</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Mode hors-ligne</p>
                  <p className="text-xs text-text-muted">
                    Catalogue accessible sans connexion (si déjà consulté)
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const next = !offlineMode;
                  setOfflineModeState(next);
                  setOfflineMode(next, user?.id);
                  if (next) await enableOfflineMode();
                  else setOfflineHint(null);
                }}
                disabled={offlinePrefetching}
                aria-label={offlineMode ? 'Désactiver le mode hors-ligne' : 'Activer le mode hors-ligne'}
                className={[
                  'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-60',
                  offlineMode ? 'bg-linear-to-br from-brand to-brand-end' : 'bg-border',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                    offlineMode ? 'translate-x-5' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>

          <PwaInstallPrompt className="mt-3" />

          {(offlinePrefetching || offlineHint) && (
            <div className="mt-3 p-3 rounded-xl bg-bg-card border border-border">
              <p className="text-xs text-text-muted">
                {offlinePrefetching ? 'Préchargement du contenu pour le hors-ligne…' : offlineHint}
              </p>
            </div>
          )}

          <OfflineBanner className="mt-3" />
        </section>

        {/* Logout */}
        <section>
          <button
            onClick={logout}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-alert border border-alert bg-[#2A1020] hover:opacity-80 transition-opacity min-h-11"
          >
            Se déconnecter
          </button>
        </section>

      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
