/**
 * AuthContext.tsx
 *
 * Gestion de l'état d'authentification React.
 *
 * [VULN-28] Pas de lecture de localStorage au montage — restauration de session
 *           via refresh silencieux (cookie httpOnly → nouvel access token en mémoire).
 * [VULN-30] logout() nettoie les clés d'onboarding dans localStorage pour éviter
 *           toute fuite d'état entre utilisateurs sur un appareil partagé.
 * [FIX-COOKIE] La restauration de session utilise l'instance axios (api) avec
 *              withCredentials: true, garantissant l'envoi automatique du cookie.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile, Role } from '../types/auth';
import { api, authApi, setAccessToken, clearAccessToken, getAccessToken } from '../api/authApi';
import type { LoginResponse } from '../types/auth';
import { applyProfileOnboarding, resetOnboarding } from '../utils/onboarding';
import { resetPreferences } from '../utils/preferences';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { flushProgressUpdates, getPendingProgressUpdatesCount } from '../utils/offlineQueue';
import { clearStudentSnapshot, saveStudentSnapshot } from '../utils/offlineStudentStore';
import { studentApi } from '../api/studentApi';
import { dispatchProgressUpdated } from '../lib/progressEvents';
import { notifyServiceWorkerProgressSynced } from '../lib/swNotify';

export type OfflineSyncState = {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
};

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, profile?: UserProfile) => Promise<UserProfile>;
  logout: () => Promise<void>;
  offlineSync: OfflineSyncState;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isOnline = useOnlineStatus();
  const [offlineSync, setOfflineSync] = useState<OfflineSyncState>({
    pendingCount: 0,
    isSyncing: false,
    lastSyncAt: null,
    lastError: null,
  });

  useEffect(() => {
    let cancelled = false;

    const tryRestoreSession = async () => {
      try {
        // Tente d'obtenir un access token via le cookie httpOnly refresh_token.
        // Le body est vide : le backend lit le refresh token depuis le cookie.
        // withCredentials: true est configuré globalement sur l'instance axios (api).
        const refreshResponse = await api.post<LoginResponse>('/auth/refresh', {});

        setAccessToken(refreshResponse.data.accessToken);

        const profile = await authApi.me();
        if (!cancelled) {
          applyProfileOnboarding(profile);
          setUser(profile);
        }
      } catch {
        // Cookie absent ou expiré → état non-authentifié (cas normal)
        clearAccessToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    tryRestoreSession();
    return () => { cancelled = true; };
  }, []);

  // Maintient le compteur pending à jour (ex: actions offline depuis d'autres pages).
  useEffect(() => {
    if (!user?.id) {
      setOfflineSync((s) => ({ ...s, pendingCount: 0, isSyncing: false, lastError: null }));
      return;
    }

    const refresh = () => {
      const pending = getPendingProgressUpdatesCount(user.id);
      setOfflineSync((s) => ({ ...s, pendingCount: pending }));
    };

    refresh();
    const id = window.setInterval(refresh, 1500);
    return () => window.clearInterval(id);
  }, [user?.id]);

  // Sync à la reconnexion, au retour sur l'onglet, et après background sync Workbox.
  useEffect(() => {
    const refreshPending = () => {
      if (!user?.id) return;
      setOfflineSync((s) => ({ ...s, pendingCount: getPendingProgressUpdatesCount(user.id) }));
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) refreshPending();
    };

    const onOnline = () => refreshPending();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_PROGRESS_DONE') {
          refreshPending();
          dispatchProgressUpdated();
        }
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isOnline) return;
    if (!user?.id) return;
    if (offlineSync.isSyncing) return;
    if (offlineSync.pendingCount === 0) return;

    let cancelled = false;
    setOfflineSync((s) => ({ ...s, isSyncing: true, lastError: null }));

    flushProgressUpdates(user.id, async (u) => {
      await studentApi.updateProgress(u.trickId, {
        status: u.status,
        masteryScore: u.masteryScore,
      });
    })
      .then(async (r) => {
        if (cancelled) return;
        const nextPending = getPendingProgressUpdatesCount(user.id);
        if (r.applied > 0) {
          dispatchProgressUpdated();
          notifyServiceWorkerProgressSynced();
          try {
            const [progress, stats] = await Promise.all([
              studentApi.getMyProgress(),
              studentApi.getStatistics().catch(() => null),
            ]);
            await saveStudentSnapshot(user.id, {
              progress,
              ...(stats ? { stats } : {}),
            });
          } catch {
            // snapshot refresh best-effort
          }
        }
        setOfflineSync((s) => ({
          ...s,
          pendingCount: nextPending,
          isSyncing: false,
          lastSyncAt: r.applied > 0 ? new Date().toISOString() : s.lastSyncAt,
          lastError: r.failed > 0 ? 'Certaines mises à jour n’ont pas pu être synchronisées.' : null,
        }));
      })
      .catch((err: any) => {
        if (cancelled) return;
        const status = err?.response?.status;
        const msg =
          status === 401 ? 'Synchronisation impossible: session expirée.' :
          status === 403 ? 'Synchronisation impossible: accès refusé.' :
          'Synchronisation impossible: réessaiera automatiquement.';
        setOfflineSync((s) => ({ ...s, isSyncing: false, lastError: msg }));
      });

    return () => { cancelled = true; };
  }, [isOnline, user?.id, offlineSync.isSyncing, offlineSync.pendingCount]);

  const login = async (token: string, profile?: UserProfile): Promise<UserProfile> => {
    setAccessToken(token);
    const resolvedProfile = profile ?? await authApi.me();
    applyProfileOnboarding(resolvedProfile);
    setUser(resolvedProfile);
    // met à jour le compteur dès le login
    if (resolvedProfile.id != null) {
      setOfflineSync((s) => ({
        ...s,
        pendingCount: getPendingProgressUpdatesCount(resolvedProfile.id),
      }));
    }
    return resolvedProfile;
  };

  /**
   * [VULN-30] Nettoyage complet : access token mémoire + onboarding localStorage.
   */
  const logout = async (): Promise<void> => {
    if (user?.id) {
      resetOnboarding(user.id);
      resetPreferences(user.id);
      void clearStudentSnapshot(user.id);
    }

    await authApi.logout().catch(() => {
      // Déconnexion locale garantie même si le serveur ne répond pas
    });

    clearAccessToken();
    setUser(null);
    setOfflineSync({
      pendingCount: 0,
      isSyncing: false,
      lastSyncAt: null,
      lastError: null,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!getAccessToken() && !!user,
        login,
        logout,
        offlineSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

export function useRole(): Role | null {
  const { user } = useAuth();
  return user?.role ?? null;
}