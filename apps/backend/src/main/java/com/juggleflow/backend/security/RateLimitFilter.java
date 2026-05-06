package com.juggleflow.backend.security;

import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Filtre de limitation du débit (rate limiting) sur les endpoints d'authentification.
 *
 * Protections appliquées :
 *
 * [VULN-09] Bypass via X-Forwarded-For : l'IP réelle (TCP) est utilisée par défaut.
 *           Le header XFF n'est lu que si app.trusted-proxy=true, et on prend
 *           la dernière entrée (ajoutée par le proxy, non forgeable par le client).
 *
 * [VULN-10] La ConcurrentHashMap est bornée à MAX_BUCKET_ENTRIES entrées.
 *           Au-delà, les nouvelles IPs sont rejetées (fail-closed) pour éviter
 *           un memory exhaustion DoS sur la map elle-même.
 *           TODO prod multi-nœuds : migrer vers bucket4j-redis.
 *
 * [VULN-11] /api/auth/refresh ajouté dans RATE_LIMITED_PATHS.
 *
 * [VULN-12] Header Retry-After: 60 présent sur toutes les réponses 429.
 *
 * [FIX-TRUSTEDPROXY] CORRECTION 04/05/2026 — app.trusted-proxy était lu via
 *                     System.getProperty() / System.getenv(), contournant la
 *                     gestion centralisée de configuration Spring Boot et rendant
 *                     la propriété invisible dans les logs de contexte applicatif.
 *                     CORRECTION : injection via @Value avec valeur par défaut
 *                     sécurisée (false). La propriété est désormais déclarée dans
 *                     application.properties et surchargeable par variable d'env
 *                     APP_TRUSTED_PROXY (convention Spring Boot).
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

  private static final int MAX_REQUESTS_PER_MINUTE = 10;
  private static final int MAX_BUCKET_ENTRIES      = 10_000;

  /** [VULN-11] /api/auth/refresh inclus dans le périmètre du rate limiting. */
  private static final Set<String> RATE_LIMITED_PATHS = Set.of(
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh"
  );

  /**
   * [FIX-TRUSTEDPROXY] Injection Spring : la valeur est lue depuis
   * application.properties (app.trusted-proxy) ou la variable d'env
   * APP_TRUSTED_PROXY. Valeur par défaut : false (sécurisé).
   */
  @Value("${app.trusted-proxy:false}")
  private boolean trustedProxy;

  /**
   * Permet de désactiver le rate limiting (ex: tests automatisés).
   * Valeur par défaut : true (sécurisé).
   */
  @Value("${app.rate-limit.enabled:true}")
  private boolean rateLimitEnabled;

  /**
   * [VULN-10] Map bornée à MAX_BUCKET_ENTRIES entrées.
   * Bucket4j gère l'expiration via la fenêtre de refill (1 min).
   */
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain)
    throws ServletException, IOException {

    if (!rateLimitEnabled) {
      filterChain.doFilter(request, response);
      return;
    }

    String path = request.getRequestURI();

    boolean isRateLimited = RATE_LIMITED_PATHS.stream()
      .anyMatch(path::startsWith);

    if (!isRateLimited) {
      filterChain.doFilter(request, response);
      return;
    }

    String clientIp = getClientIp(request);

    // [VULN-10] Fail-closed : protection contre le memory exhaustion DoS
    if (buckets.size() >= MAX_BUCKET_ENTRIES && !buckets.containsKey(clientIp)) {
      log.warn("Rate limit map saturée ({} entrées) — rejet de l'IP {}",
        MAX_BUCKET_ENTRIES, clientIp);
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
   * Extraction sécurisée de l'IP cliente.
   *
   * [VULN-09] Sans proxy de confiance (défaut) : request.getRemoteAddr() — IP TCP réelle.
   * [FIX-TRUSTEDPROXY] Avec proxy de confiance (app.trusted-proxy=true) : dernière IP
   *                     du header X-Forwarded-For (ajoutée par le proxy, non forgeable).
   *
   * Pourquoi la DERNIÈRE et non la première ?
   * Le header XFF est construit en append : "client, proxy1, proxy2". La première
   * valeur est fournie par le client et peut être forgée librement. La dernière est
   * ajoutée par le reverse-proxy de confiance qui parle directement à l'application.
   */
  private String getClientIp(HttpServletRequest request) {
    if (trustedProxy) {
      String xForwardedFor = request.getHeader("X-Forwarded-For");
      if (xForwardedFor != null && !xForwardedFor.isBlank()) {
        String[] parts = xForwardedFor.split(",");
        return parts[parts.length - 1].trim();
      }
    }
    return request.getRemoteAddr();
  }

  /** [VULN-12] Réponse 429 conforme avec header Retry-After. */
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
