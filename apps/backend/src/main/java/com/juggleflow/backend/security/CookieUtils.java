package com.juggleflow.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

/**
 * Utilitaire centralisé pour la gestion du cookie httpOnly du refresh token.
 *
 * Architecture de sécurité des tokens (2026) :
 *   - Access token  → body JSON (mémoire JS côté client, durée courte ~15 min)
 *   - Refresh token → cookie httpOnly/Secure/SameSite=Strict (inaccessible à JS)
 *
 * Avantages du cookie httpOnly pour le refresh token :
 *   - Un XSS ne peut pas lire ni exfiltrer le refresh token.
 *   - SameSite=Strict bloque les requêtes cross-site (protection CSRF native).
 *   - Le Secure flag garantit HTTPS en production.
 *
 * Toute la logique de création, lecture et suppression du cookie est
 * centralisée ici pour éviter toute duplication et garantir des attributs
 * cohérents dans toute l'application.
 */
@Component
public class CookieUtils {

  /** Nom du cookie — identique côté frontend (withCredentials=true). */
  public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

  /** Path restreint : le cookie n'est envoyé qu'aux endpoints /api/auth/. */
  private static final String COOKIE_PATH = "/api/auth";

  @Value("${jwt.refresh-expiration-ms}")
  private long refreshExpirationMs;

  /**
   * Écrit le refresh token dans un cookie httpOnly sur la réponse HTTP.
   * Appelé après login et après rotation du refresh token.
   */
  public void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
    Cookie cookie = buildCookie(refreshToken, (int) (refreshExpirationMs / 1000));
    response.addCookie(cookie);
  }

  /**
   * Lit le refresh token depuis les cookies de la requête.
   *
   * @return le refresh token, ou empty si le cookie est absent
   */
  public Optional<String> extractRefreshToken(HttpServletRequest request) {
    if (request.getCookies() == null) {
      return Optional.empty();
    }
    return Arrays.stream(request.getCookies())
      .filter(c -> REFRESH_TOKEN_COOKIE.equals(c.getName()))
      .map(Cookie::getValue)
      .filter(v -> v != null && !v.isBlank())
      .findFirst();
  }

  /**
   * Supprime le cookie refresh token côté navigateur (Max-Age=0).
   * Appelé lors du logout.
   */
  public void clearRefreshTokenCookie(HttpServletResponse response) {
    Cookie cookie = buildCookie("", 0);
    response.addCookie(cookie);
  }

  // ── Helper ───────────────────────────────────────────────────

  private Cookie buildCookie(String value, int maxAgeSeconds) {
    Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, value);
    cookie.setHttpOnly(true);   // inaccessible à JavaScript
    cookie.setSecure(true);     // HTTPS uniquement
    cookie.setPath(COOKIE_PATH);
    cookie.setMaxAge(maxAgeSeconds);
    cookie.setAttribute("SameSite", "Strict");
    return cookie;
  }
}
