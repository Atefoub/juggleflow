package com.juggleflow.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Résout une URL GIF Juggling Lab via le serveur public
 * {@code https://jugglinglab.org/anim} (la variable {@code redirect=true} ne renvoie
 * plus de redirection HTTP — la page HTML contient l'URL Google Cloud Storage).
 */
@Slf4j
@Service
public class JugglingLabAnimationService {

    private static final String JUGGLING_LAB_ANIM = "https://jugglinglab.org/anim";
    private static final Pattern GIF_SRC_PATTERN = Pattern.compile(
            "<img\\s+src=\"(https://storage\\.googleapis\\.com/[^\"]+)\"",
            Pattern.CASE_INSENSITIVE);

    private static final int MAX_PATTERN_LENGTH = 200;
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration CACHE_TTL = Duration.ofHours(24);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(HTTP_TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    /**
     * @param pattern siteswap (notation généralisée Juggling Lab)
     * @return URL directe du fichier GIF (storage.googleapis.com)
     */
    public String resolveGifUrl(
            String pattern,
            Integer width,
            Integer height,
            Double slowdown) {

        String normalized = normalizePattern(pattern);
        String cacheKey = buildCacheKey(normalized, width, height, slowdown);

        CacheEntry cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return cached.gifUrl();
        }

        String pageUrl = buildJugglingLabPageUrl(normalized, width, height, slowdown);
        String html = fetchPage(pageUrl);
        String gifUrl = extractGifUrl(html);

        cache.put(cacheKey, new CacheEntry(gifUrl, System.nanoTime() + CACHE_TTL.toNanos()));
        return gifUrl;
    }

    private static String normalizePattern(String pattern) {
        if (!StringUtils.hasText(pattern)) {
            throw new IllegalArgumentException("Le siteswap est obligatoire.");
        }
        String trimmed = pattern.trim();
        if (trimmed.length() > MAX_PATTERN_LENGTH) {
            throw new IllegalArgumentException("Siteswap trop long.");
        }
        if (!trimmed.matches("[0-9a-zA-Z(),x\\s^+*\\[\\]{}|./_-]+")) {
            throw new IllegalArgumentException("Caractères non autorisés dans le siteswap.");
        }
        return trimmed;
    }

    private static String buildJugglingLabPageUrl(
            String pattern,
            Integer width,
            Integer height,
            Double slowdown) {

        StringBuilder query = new StringBuilder("pattern=")
                .append(URLEncoder.encode(pattern, StandardCharsets.UTF_8));
        if (width != null && width > 0) {
            query.append("&width=").append(width);
        }
        if (height != null && height > 0) {
            query.append("&height=").append(height);
        }
        if (slowdown != null && slowdown > 0) {
            query.append("&slowdown=").append(slowdown);
        }
        return JUGGLING_LAB_ANIM + "?" + query;
    }

    private String fetchPage(String pageUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(pageUrl))
                    .timeout(HTTP_TIMEOUT)
                    .header("User-Agent", "JuggleFlow/1.0 (+https://juggleflow.local)")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new IllegalStateException(
                        "Juggling Lab a répondu avec le code " + response.statusCode());
            }
            return response.body();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Interruption lors de l'appel Juggling Lab.", ex);
        } catch (IOException ex) {
            throw new IllegalStateException(
                    "Impossible de contacter le serveur Juggling Lab.", ex);
        }
    }

    private static String extractGifUrl(String html) {
        Matcher matcher = GIF_SRC_PATTERN.matcher(html);
        if (!matcher.find()) {
            throw new IllegalStateException(
                    "Aucune animation GIF trouvée dans la réponse Juggling Lab.");
        }
        return HtmlUtils.htmlUnescape(matcher.group(1));
    }

    private static String buildCacheKey(
            String pattern, Integer width, Integer height, Double slowdown) {
        return pattern + "|" + width + "|" + height + "|" + slowdown;
    }

    private record CacheEntry(String gifUrl, long expiresAtNanos) {
        boolean isExpired() {
            return System.nanoTime() > expiresAtNanos;
        }
    }
}
