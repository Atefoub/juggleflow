package com.juggleflow.backend.security;

// FIX #2 : Suppression des imports de l'ancienne API dépréciée Bucket4j.
// Bandwidth (classe statique) et Refill (classe standalone) sont dépréciés
// depuis Bucket4j 8.2.x. La nouvelle API passe exclusivement par le builder fluent.
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

    /**
     * FIX #2 (MAJEUR) : Remplacement de l'ancienne API Bucket4j dépréciée
     * par la nouvelle API fluent lambda introduite en 8.2.x.
     *
     * AVANT (déprécié) :
     *   Bandwidth limit = Bandwidth.classic(MAX, Refill.greedy(MAX, Duration.ofMinutes(1)));
     *   return Bucket.builder().addLimit(limit).build();
     *
     * APRÈS (API courante 8.x) :
     */
    private Bucket createBucket() {
        return Bucket.builder()
                .addLimit(limit -> limit
                        .capacity(MAX_REQUESTS_PER_MINUTE)
                        .refillGreedy(MAX_REQUESTS_PER_MINUTE, Duration.ofMinutes(1))
                )
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}