package com.juggleflow.backend.security;

import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting sur login, register et refresh.
 * IP via {@code getRemoteAddr()} sauf si {@code app.trusted-proxy=true} (dernière entrée XFF).
 * Map bornée ; en prod multi-nœuds : Redis (compteur TTL).
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

  private static final int MAX_BUCKET_ENTRIES_DEFAULT = 10_000;

  private static final Set<String> RATE_LIMITED_PATHS = Set.of(
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh"
  );

  @Value("${app.trusted-proxy:false}")
  private boolean trustedProxy;

  @Value("${app.rate-limit.enabled:true}")
  private boolean rateLimitEnabled;

  /**
   * store:
   * - memory : Bucket4j en mémoire JVM (dev uniquement)
   * - redis  : compteur Redis partagé (prod / multi-instances)
   */
  @Value("${app.rate-limit.store:memory}")
  private String store;

  @Value("${app.rate-limit.max-requests:10}")
  private int maxRequests;

  @Value("${app.rate-limit.window-seconds:60}")
  private int windowSeconds;

  @Value("${app.rate-limit.max-bucket-entries:10000}")
  private int maxBucketEntries;

  @Autowired(required = false)
  private StringRedisTemplate redis;

  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  private static final String REDIS_KEY_PREFIX = "ratelimit:auth:ip:";

  private static final DefaultRedisScript<Long> INCR_WITH_EXPIRE_SCRIPT = new DefaultRedisScript<>(
    """
      local current = redis.call('INCR', KEYS[1])
      if tonumber(current) == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      return current
      """,
    Long.class
  );

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

    if ("redis".equalsIgnoreCase(store)) {
      if (redis == null) {
        throw new IllegalStateException(
          "app.rate-limit.store=redis mais Redis n'est pas configuré. " +
            "Définissez REDIS_HOST/REDIS_PORT (ou repassez app.rate-limit.store=memory).");
      }

      String key = REDIS_KEY_PREFIX + clientIp;
      Long current = redis.execute(
        INCR_WITH_EXPIRE_SCRIPT,
        List.of(key),
        String.valueOf(windowSeconds)
      );

      long n = (current == null) ? Long.MAX_VALUE : current;
      if (n <= maxRequests) {
        filterChain.doFilter(request, response);
      } else {
        log.warn("Rate limit dépassé (Redis) pour IP : {}", clientIp);
        sendTooManyRequests(response);
      }
      return;
    }

    // Fallback dev (memory, mono-instance)
    if (maxBucketEntries <= 0) {
      maxBucketEntries = MAX_BUCKET_ENTRIES_DEFAULT;
    }

    if (buckets.size() >= maxBucketEntries && !buckets.containsKey(clientIp)) {
      log.warn("Rate limit map saturée ({} entrées) — rejet de l'IP {}",
        maxBucketEntries, clientIp);
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
        .capacity(maxRequests)
        .refillGreedy(maxRequests, Duration.ofSeconds(windowSeconds))
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
    response.setHeader("Retry-After", String.valueOf(windowSeconds));
    response.getWriter().write("""
      {"error":"Too Many Requests",
       "message":"Trop de tentatives. Réessayez dans une minute.",
       "status":429}
      """);
  }
}
