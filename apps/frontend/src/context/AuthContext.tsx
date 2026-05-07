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
import { authApi, setAccessToken, clearAccessToken, getAccessToken } from '../api/authApi';
import { resetOnboarding } from '../utils/onboarding';
import { resetPreferences } from '../utils/preferences';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, profile?: UserProfile) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const tryRestoreSession = async () => {
      try {
        // Tente d'obtenir un access token via le cookie httpOnly refresh_token.
        // Le body est vide : le backend lit le refresh token depuis le cookie.
        // withCredentials: true est configuré globalement sur l'instance axios (api).
        const { api } = await import('../api/authApi');
        const refreshResponse = await api.post<import('../types/auth').LoginResponse>(
          '/auth/refresh', {}
        );

        setAccessToken(refreshResponse.data.accessToken);

        const { authApi } = await import('../api/authApi');
        const profile = await authApi.me();
        if (!cancelled) {
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

  const login = async (token: string, profile?: UserProfile): Promise<UserProfile> => {
    setAccessToken(token);
    const resolvedProfile = profile ?? await authApi.me();
    setUser(resolvedProfile);
    return resolvedProfile;
  };

  /**
   * [VULN-30] Nettoyage complet : access token mémoire + onboarding localStorage.
   */
  const logout = async (): Promise<void> => {
    if (user?.id) {
      resetOnboarding(user.id);
      resetPreferences(user.id);
    }

    await authApi.logout().catch(() => {
      // Déconnexion locale garantie même si le serveur ne répond pas
    });

    clearAccessToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!getAccessToken() && !!user,
        login,
        logout,
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