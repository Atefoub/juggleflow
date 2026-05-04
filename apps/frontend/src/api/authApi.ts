/**
 * authApi.ts
 *
 * Architecture de sécurité des tokens (04/05/2026) :
 *
 *   Access token  → stocké EN MÉMOIRE (variable de module _accessToken).
 *                   Jamais dans localStorage/sessionStorage : inaccessible
 *                   à un script JS injecté (XSS).
 *                   Perdu au rechargement → restauré silencieusement via /refresh.
 *
 *   Refresh token → géré exclusivement par le backend sous forme de cookie
 *                   httpOnly/Secure/SameSite=Strict. Le JS ne le voit jamais.
 *                   Envoyé automatiquement par le navigateur sur /api/auth/*
 *                   grâce à withCredentials: true.
 *
 * [VULN-28] Suppression du stockage localStorage des tokens.
 * [VULN-29] Intercepteur 401 : refresh silencieux avant redirection login.
 * [FIX-COOKIE] /auth/refresh envoi body vide — le cookie httpOnly est lu
 *              automatiquement par le backend (plus de refreshToken dans le body).
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
  // withCredentials=true : envoie le cookie httpOnly du refresh token automatiquement
  withCredentials: true,
});

// ── Intercepteur requête : injecte l'access token depuis la mémoire ──

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
  /**
   * Authentifie l'utilisateur. Le backend pose le cookie refresh_token httpOnly
   * automatiquement — aucune action côté client nécessaire pour le gérer.
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  me: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/auth/me');
    return response.data;
  },

  /**
   * Déconnecte l'utilisateur :
   *   1. Appelle POST /auth/logout → révocation du refresh token serveur
   *      + suppression du cookie httpOnly par Set-Cookie: Max-Age=0.
   *   2. Efface l'access token en mémoire locale.
   *
   * Le logout est tenté même si l'access token est expiré (route publique
   * côté backend) pour garantir la révocation du cookie.
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAccessToken();
    }
  },
};