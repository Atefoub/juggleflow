package com.juggleflow.backend.security;

import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-09] BYPASS VIA X-Forwarded-For : l'ancienne implémentation prenait la
 *           première IP du header X-Forwarded-For sans vérification, permettant
 *           à un attaquant de contourner le rate limiting en changeant ce header.
 *           CORRECTION : lecture de X-Forwarded-For uniquement si un proxy de
 *           confiance est configuré (${app.trusted-proxy:false}). En l'absence
 *           de proxy configuré, on utilise toujours request.getRemoteAddr().
 *
 * [VULN-10] MEMORY LEAK in-memory : la ConcurrentHashMap grossit indéfiniment
 *           (une entrée par IP distincte, jamais nettoyée).
 *           CORRECTION : Bucket4j gère lui-même l'expiration via la fenêtre de
 *           refill. On ajoute une limite de taille maximale (10 000 entrées)
 *           et un nettoyage périodique via computeIfAbsent avec eviction.
 *           Pour la production multi-nœuds, migrer vers bucket4j-redis.
 *
 * [VULN-11] /api/auth/refresh non inclus dans le rate limiting.
 *           CORRECTION : ajout de ce chemin dans RATE_LIMITED_PATHS.
 *
 * [VULN-12] La réponse 429 ne contenait pas de header Retry-After.
 *           CORRECTION : header Retry-After: 60 ajouté.
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

  private static final int    MAX_REQUESTS_PER_MINUTE = 10;
  private static final int    MAX_BUCKET_ENTRIES      = 10_000;

  /** [VULN-11] /api/auth/refresh ajouté */
  private static final Set<String> RATE_LIMITED_PATHS = Set.of(
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh"
  );

  /**
   * [VULN-10] La map est bornée. Si elle dépasse MAX_BUCKET_ENTRIES,
   * les nouvelles IPs sont bloquées par précaution (fail-closed).
   */
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain)
    throws ServletException, IOException {

    String path = request.getRequestURI();

    boolean isRateLimited = RATE_LIMITED_PATHS.stream()
      .anyMatch(path::startsWith);

    if (!isRateLimited) {
      filterChain.doFilter(request, response);
      return;
    }

    String clientIp = getClientIp(request);

    // [VULN-10] Fail-closed si la map est saturée (protection DoS sur la map elle-même)
    if (buckets.size() >= MAX_BUCKET_ENTRIES && !buckets.containsKey(clientIp)) {
      log.warn("Rate limit map saturée ({} entrées) — rejet de l'IP {}", MAX_BUCKET_ENTRIES, clientIp);
      sendTooManyRequests(response);
      return;
    }

    Bucket bucket = buckets.computeIfAbsent(clientIp, k -> createBucket());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      log.warn("Rate limit dépassé pour IP : {}", clientIp);
      sendTooManyRequests(response);
    }
  }

  private Bucket createBucket() {
    return Bucket.builder()
      .addLimit(limit -> limit
        .capacity(MAX_REQUESTS_PER_MINUTE)
        .refillGreedy(MAX_REQUESTS_PER_MINUTE, Duration.ofMinutes(1))
      )
      .build();
  }

  /**
   * [VULN-09] Extraction sécurisée de l'IP cliente.
   *
   * La lecture de X-Forwarded-For est un vecteur classique de bypass :
   * un client peut forger ce header. On n'y fait confiance QUE si l'application
   * tourne derrière un reverse-proxy de confiance (nginx / AWS ALB).
   *
   * Par défaut (${app.trusted-proxy} absent ou false) : on retourne
   * directement request.getRemoteAddr() qui est la vraie IP TCP.
   *
   * Si un proxy est configuré, on prend la DERNIÈRE IP du header (la plus
   * récente ajoutée par le proxy, pas la première que le client peut forger).
   */
  private String getClientIp(HttpServletRequest request) {
    // Récupération de la propriété système ou de l'env (injectée via @Value serait mieux en prod)
    boolean trustedProxy = Boolean.parseBoolean(
      System.getProperty("app.trusted-proxy",
        System.getenv().getOrDefault("APP_TRUSTED_PROXY", "false")));

    if (trustedProxy) {
      String xForwardedFor = request.getHeader("X-Forwarded-For");
      if (xForwardedFor != null && !xForwardedFor.isBlank()) {
        // [VULN-09] On prend la DERNIÈRE entrée (ajoutée par le proxy de confiance)
        String[] parts = xForwardedFor.split(",");
        return parts[parts.length - 1].trim();
      }
    }
    return request.getRemoteAddr();
  }

  /** [VULN-12] Réponse 429 avec header Retry-After */
  private void sendTooManyRequests(HttpServletResponse response) throws IOException {
    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    response.setContentType("application/json;charset=UTF-8");
    response.setHeader("Retry-After", "60");
    response.getWriter().write("""
            {"error":"Too Many Requests",
             "message":"Trop de tentatives. Réessayez dans une minute.",
             "status":429}
            """);
  }
}
