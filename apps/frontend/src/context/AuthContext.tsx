/**
 * AuthContext.tsx — CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-28] Le token n'est plus lu depuis localStorage au montage.
 *           Au lieu de ça, on tente un refresh silencieux via le cookie httpOnly
 *           pour restaurer la session sans exposer le token dans le stockage navigateur.
 *
 * [VULN-30] ONBOARDING STATE dans localStorage :
 *           Les clés "onboarding_completed:<userId>" dans localStorage sont peu
 *           sensibles (pas de données personnelles) mais doivent être nettoyées
 *           au logout pour éviter des fuites d'état entre utilisateurs sur le
 *           même appareil (ex: école avec ordinateurs partagés).
 *           CORRECTION : logout() nettoie maintenant les clés d'onboarding.
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

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, profile?: UserProfile) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * [VULN-28] Au montage : on ne lit PLUS localStorage.
   * On tente un refresh silencieux via le cookie httpOnly.
   * Si le cookie est absent ou expiré → état non-authentifié.
   */
  useEffect(() => {
    let cancelled = false;

    const tryRestoreSession = async () => {
      try {
        // Tente d'obtenir un access token via le refresh token (cookie httpOnly)
        const { authApi: freshApi } = await import('../api/authApi');
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',           // envoie le cookie httpOnly
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!refreshResponse.ok) {
          // Pas de session active → état initial non-authentifié
          return;
        }

        const data = await refreshResponse.json();
        setAccessToken(data.accessToken);

        // Charge le profil avec le nouvel access token
        const profile = await freshApi.me();
        if (!cancelled) {
          setUser(profile);
        }
      } catch {
        // Refresh échoué → pas de session (normal)
        clearAccessToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    tryRestoreSession();
    return () => { cancelled = true; };
  }, []);

  /**
   * Appelé après un login réussi.
   * token = access token (déjà stocké en mémoire par authApi.login()).
   */
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
    // Nettoyage de l'état local onboarding (localStorage) avant de perdre le user.id
    if (user?.id) {
      resetOnboarding(user.id);
    }

    await authApi.logout().catch(() => {
      // On déconnecte quand même localement même si le serveur ne répond pas
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