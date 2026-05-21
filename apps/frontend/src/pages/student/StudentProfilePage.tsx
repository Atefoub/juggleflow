import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppIcon from '../../components/icons/AppIcon';
import {
  ONBOARDING_LEVEL_ICON,
  RANK_INLINE_ICON,
  type IconName,
} from '../../components/icons/iconRegistry';
import BottomNav from '../../components/BottomNav';
import { STUDENT_NAV_ITEMS } from '../../config/studentNav';
import ProgressBar from '../../components/ProgressBar';
import PathTrickList from '../../components/student/PathTrickList';
import type { StudentStats, LearningPath } from '../../api/studentApi';
import {
  getStudentLearningPaths,
  getStudentProgress,
  getStudentSnapshotSavedAt,
  getStudentStatistics,
} from '../../api/studentOffline';
import { mergePendingIntoProgress } from '../../utils/offlineQueue';
import { PROGRESS_UPDATED_EVENT } from '../../lib/progressEvents';
import { computePathCompletionPercent } from '../../utils/pathProgress';
import { getAccessToken } from '../../api/authApi';
import { studentOnboardingApi } from '../../api/studentOnboardingApi';
import {
  applyProfileOnboarding,
  getOnboardingLevel,
  setOnboardingLevel,
  type OnboardingLevel,
} from '../../utils/onboarding';
import {
  getOfflineMode,
  getPracticeRemindersEnabled,
  setOfflineMode,
  setPracticeRemindersEnabled,
} from '../../utils/preferences';
import { studentPreferencesApi } from '../../api/studentPreferencesApi';
import { prefetchOfflineContent } from '../../utils/prefetchOfflineContent';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import OfflineBanner from '../../components/OfflineBanner';
import PwaInstallPrompt from '../../components/PwaInstallPrompt';

const XP_PER_TRICK = 100;
const XP_MAX = 500;

export default function StudentProfilePage() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const [stats, setStats]       = useState<StudentStats | null>(null);
  const [paths, setPaths]       = useState<LearningPath[]>([]);
  const [progressByTrickId, setProgressByTrickId] = useState<
    Record<number, 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED'>
  >({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [notificationsOn, setNotificationsOn] = useState(() =>
    getPracticeRemindersEnabled(user?.id),
  );
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [notificationsHint, setNotificationsHint] = useState<string | null>(null);
  const [darkMode, setDarkMode]               = useState(true);
  const [offlineMode, setOfflineModeState]    = useState(() => getOfflineMode(user?.id));
  const [offlinePrefetching, setOfflinePrefetching] = useState(false);
  const [offlineHint, setOfflineHint]         = useState<string | null>(null);
  const [snapshotSavedAt, setSnapshotSavedAt] = useState<string | null>(null);
  const [pathProgressPercent, setPathProgressPercent] = useState(0);

  const loadProfileData = () => {
    if (!user?.id) return;
    Promise.all([
      getStudentStatistics(isOnline, user.id),
      getStudentLearningPaths(isOnline, user.id),
      getStudentProgress(isOnline, user.id).then((p) => mergePendingIntoProgress(user.id, p)),
    ])
      .then(([s, p, mergedProgress]) => {
        setStats(s);
        setPaths(p);
        const byId: Record<number, 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED'> = {};
        for (const row of mergedProgress) {
          byId[row.trickId] = row.status;
        }
        setProgressByTrickId(byId);
      })
      .catch(() => setError('Impossible de charger les données du profil.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    loadProfileData();
  }, [user?.id, isOnline]);

  useEffect(() => {
    const handler = () => loadProfileData();
    window.addEventListener(PROGRESS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PROGRESS_UPDATED_EVENT, handler);
  }, [user?.id, isOnline]);

  useEffect(() => {
    setOfflineModeState(getOfflineMode(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadPreferences = async () => {
      if (isOnline) {
        try {
          const prefs = await studentPreferencesApi.get();
          if (cancelled) return;
          setNotificationsOn(prefs.practiceRemindersEnabled);
          setPracticeRemindersEnabled(prefs.practiceRemindersEnabled, user.id);
        } catch {
          if (!cancelled) {
            setNotificationsOn(getPracticeRemindersEnabled(user.id));
          }
        }
      } else {
        setNotificationsOn(getPracticeRemindersEnabled(user.id));
      }
    };

    void loadPreferences();
    return () => { cancelled = true; };
  }, [user?.id, isOnline]);

  useEffect(() => {
    if (!user?.id || !offlineMode) {
      setSnapshotSavedAt(null);
      return;
    }
    getStudentSnapshotSavedAt(user.id).then(setSnapshotSavedAt);
  }, [user?.id, offlineMode, offlineHint]);

  async function enableOfflineMode() {
    setOfflineHint(null);
    setOfflinePrefetching(true);
    try {
      if (!user?.id) return;
      if (!isOnline) {
        setOfflineHint('Connecte-toi pour précharger le contenu, puis réactive le mode hors-ligne.');
        return;
      }

      const result = await prefetchOfflineContent(user.id);

      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready.catch(() => null);
      }
      const challengeNote = result.hasDailyChallenge ? 'défi du jour' : 'pas de défi du jour';
      setOfflineHint(
        `Contenu prêt hors-ligne : ${result.totalTricksStored} figures, ${result.pathsCount} parcours, ${result.progressCount} progressions, ${result.badgesCount} badges, ${challengeNote}.`,
      );
      setSnapshotSavedAt(new Date().toISOString());
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

  useEffect(() => {
    if (!currentPath) {
      setPathProgressPercent(0);
      return;
    }
    void computePathCompletionPercent(currentPath, progressByTrickId).then(setPathProgressPercent);
  }, [currentPath, progressByTrickId]);

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
          <AppIcon name="xp-star" size={16} label="Points d'expérience" />
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
              {([
                { value: stats?.totalTricksLearned ?? 0, label: 'Figures\napprises', iconName: 'status-mastered' as IconName, iconLabel: 'figures apprises' },
                { value: totalTimeLabel, label: 'Temps\nestimé', iconName: 'timer' as IconName, iconLabel: 'temps estimé' },
                { value: stats?.badgesEarned ?? 0, label: 'Badges\nobtenus', iconName: 'badge-mastery-10' as IconName, iconLabel: 'badges obtenus' },
              ]).map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 rounded-xl flex flex-col gap-1 bg-bg-card border border-border"
                >
                  <AppIcon name={stat.iconName} size={18} label={stat.iconLabel} />
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
                <p className="font-display font-bold text-text-primary text-base flex items-center gap-1.5">
                  <AppIcon name={RANK_INLINE_ICON.bronze} size={18} label="Rang Bronze" />
                  Bronze
                </p>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Parcours assigné
            </h2>
            {currentPath && (
              <button
                type="button"
                onClick={() => navigate(`/student/parcours/${currentPath.id}`)}
                className="text-xs text-brand-end underline underline-offset-2 hover:opacity-80"
              >
                Détail →
              </button>
            )}
          </div>
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
              <PathTrickList path={currentPath} progressByTrickId={progressByTrickId} />
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

            <div className="p-4 bg-bg-card">
              <div className="flex items-center gap-3 mb-3">
                <AppIcon
                  name={ONBOARDING_LEVEL_ICON[onboardingLevel]}
                  size={20}
                  label="Niveau"
                />
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
                      onClick={async () => {
                        if (!user?.id) return;
                        setOnboardingLevel(lvl, user.id);
                        try {
                          const profile = await studentOnboardingApi.updateLevel(lvl);
                          applyProfileOnboarding(profile);
                          const token = getAccessToken();
                          if (token) await login(token, profile);
                        } catch {
                          // garde le niveau local si hors-ligne
                        }
                      }}
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
                <AppIcon name="bell" size={20} label="Notifications" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Notifications</p>
                  <p className="text-xs text-text-muted">Rappels d'entraînement</p>
                </div>
              </div>
              <button
                type="button"
                disabled={notificationsBusy}
                onClick={async () => {
                  if (!user?.id || notificationsBusy) return;
                  const next = !notificationsOn;
                  setNotificationsBusy(true);
                  setNotificationsHint(null);
                  setNotificationsOn(next);
                  setPracticeRemindersEnabled(next, user.id);
                  try {
                    if (isOnline) {
                      const prefs = await studentPreferencesApi.update(next);
                      setNotificationsOn(prefs.practiceRemindersEnabled);
                      setPracticeRemindersEnabled(prefs.practiceRemindersEnabled, user.id);
                    }
                  } catch {
                    setNotificationsOn(!next);
                    setPracticeRemindersEnabled(!next, user.id);
                    setNotificationsHint(
                      'Impossible de sauvegarder ce réglage. Réessaie en ligne.',
                    );
                  } finally {
                    setNotificationsBusy(false);
                  }
                }}
                aria-label={notificationsOn ? 'Désactiver les notifications' : 'Activer les notifications'}
                className={[
                  'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-60',
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
            {notificationsHint && (
              <p className="px-4 pb-3 text-xs text-alert bg-bg-card">{notificationsHint}</p>
            )}

            {/* Dark mode */}
            <div className="flex items-center justify-between p-4 bg-bg-card">
              <div className="flex items-center gap-3">
                <AppIcon name="moon" size={20} label="Mode foncé" />
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

            <div className="flex items-center justify-between p-4 bg-bg-card">
              <div className="flex items-center gap-3">
                <AppIcon name="offline" size={20} label="Mode hors-ligne" />
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

          {(offlinePrefetching || offlineHint || (offlineMode && snapshotSavedAt)) && (
            <div className="mt-3 p-3 rounded-xl bg-bg-card border border-border">
              {offlinePrefetching ? (
                <p className="text-xs text-text-muted">Préchargement du contenu pour le hors-ligne…</p>
              ) : (
                <>
                  {offlineHint && <p className="text-xs text-text-muted">{offlineHint}</p>}
                  {offlineMode && snapshotSavedAt && (
                    <p className="text-xs text-text-muted mt-1">
                      Dernière synchro :{' '}
                      {new Date(snapshotSavedAt).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                </>
              )}
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

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  );
}
