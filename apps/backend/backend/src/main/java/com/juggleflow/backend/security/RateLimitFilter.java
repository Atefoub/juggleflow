package com.juggleflow.backend.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
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
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting sur /api/auth/login et /api/auth/register.
 * Limite : 10 tentatives par minute par adresse IP.
 * Implémentation in-memory avec Bucket4j (suffisant pour un seul nœud).
 * Pour un déploiement multi-nœuds, migrer vers Bucket4j + Redis.
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 10;
    private static final String[] RATE_LIMITED_PATHS = {
        "/api/auth/login",
        "/api/auth/register"
    };

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        boolean isRateLimited = false;

        for (String limitedPath : RATE_LIMITED_PATHS) {
            if (path.startsWith(limitedPath)) {
                isRateLimited = true;
                break;
            }
        }

        if (!isRateLimited) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        Bucket bucket = buckets.computeIfAbsent(clientIp, k -> createBucket());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit dépassé pour IP : {}", clientIp);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                """
                {"error":"Too Many Requests",
                 "message":"Trop de tentatives. Réessayez dans une minute.",
                 "status":429}
                """
            );
        }
    }

    private Bucket createBucket() {
        Bandwidth limit = Bandwidth.classic(
            MAX_REQUESTS_PER_MINUTE,
            Refill.greedy(MAX_REQUESTS_PER_MINUTE, Duration.ofMinutes(1))
        );
        return Bucket.builder().addLimit(limit).build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
