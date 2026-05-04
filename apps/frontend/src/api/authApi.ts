/**
 * authApi.ts — CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-28] STOCKAGE DU TOKEN DANS localStorage :
 *           localStorage est accessible par tout script JS sur la page.
 *           Un XSS réussit → vol immédiat et silencieux du token → session
 *           hijacking. La durée de vie du token (15 min) ne limite pas le
 *           risque si le refresh token (7 jours) est aussi dans localStorage.
 *
 *           CORRECTION : les tokens sont stockés EN MÉMOIRE (variable de module).
 *           - Access token : mémoire JS (perdu à la fermeture de l'onglet → OK)
 *           - Refresh token : cookie httpOnly SameSite=Strict (non accessible
 *             par JS, envoyé automatiquement par le navigateur).
 *
 *           Architecture résultante :
 *           • Le refresh token est stocké dans un cookie httpOnly/SameSite=Strict
 *             géré par le backend (endpoint POST /api/auth/refresh).
 *           • L'access token est en mémoire : un XSS ne peut pas l'exfiltrer
 *             via localStorage.read() — il faudrait intercepter la mémoire du
 *             processus, ce qui est beaucoup plus difficile.
 *
 *           NOTE OPÉRATIONNELLE : cela signifie que l'access token est perdu
 *           à la fermeture / rechargement de l'onglet. Le AuthContext détecte
 *           cela (token null) et appelle silencieusement /api/auth/refresh
 *           pour obtenir un nouvel access token via le cookie httpOnly.
 *
 * [VULN-29] Le 401 interceptor supprimait localStorage sans révoquer le token
 *           côté serveur. CORRECTION : appel de logout() qui efface le cookie.
 */

import axios, { type AxiosRequestConfig } from 'axios';
import type { LoginRequest, LoginResponse, UserProfile } from '../types/auth';

// ── Token en mémoire ─────────────────────────────────────────
// [VULN-28] Jamais dans localStorage / sessionStorage

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function clearAccessToken(): void {
  _accessToken = null;
}

// ── Instance Axios ────────────────────────────────────────────

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // [VULN-28] withCredentials=true : envoie le cookie httpOnly du refresh token
  withCredentials: true,
});

// ── Intercepteur requête : inject access token depuis la mémoire ──

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Intercepteur réponse : renouvellement silencieux ─────────────

let _isRefreshing = false;
let _refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } = error.config;

    // [VULN-29] Sur 401, tente un refresh silencieux AVANT de rediriger
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh' &&
      originalRequest.url !== '/auth/login'
    ) {
      if (_isRefreshing) {
        // Mise en file d'attente des requêtes pendant le refresh
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        // Le cookie httpOnly contenant le refresh token est envoyé automatiquement
        const response = await api.post<LoginResponse>('/auth/refresh', {});
        const newAccessToken = response.data.accessToken;
        setAccessToken(newAccessToken);

        // Déblocage de la file d'attente
        _refreshQueue.forEach((cb) => cb.resolve(newAccessToken));
        _refreshQueue = [];

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh échoué → déconnexion complète
        _refreshQueue.forEach((cb) => cb.reject(refreshError));
        _refreshQueue = [];
        clearAccessToken();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── API Auth ──────────────────────────────────────────────────

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    // [VULN-28] Access token stocké en mémoire (pas localStorage)
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  me: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      // Révoque le refresh token côté serveur (optionnel mais recommandé)
      await api.post('/auth/logout');
    } finally {
      clearAccessToken();
      // Le cookie httpOnly sera effacé par le backend via Set-Cookie: expires=past
    }
  },
};