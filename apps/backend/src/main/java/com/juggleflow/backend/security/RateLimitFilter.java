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
 * Rate limiting sur login, register et refresh.
 * IP via {@code getRemoteAddr()} sauf si {@code app.trusted-proxy=true} (dernière entrée XFF).
 * Map bornée ; TODO prod multi-nœuds : bucket4j-redis.
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

  private static final int MAX_REQUESTS_PER_MINUTE = 10;
  private static final int MAX_BUCKET_ENTRIES      = 10_000;

  private static final Set<String> RATE_LIMITED_PATHS = Set.of(
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh"
  );

  @Value("${app.trusted-proxy:false}")
  private boolean trustedProxy;

  @Value("${app.rate-limit.enabled:true}")
  private boolean rateLimitEnabled;

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

  /** Sans proxy de confiance : IP TCP. Avec proxy : dernière entrée X-Forwarded-For (non forgeable). */
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
