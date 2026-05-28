package com.juggleflow.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * Gestion des tokens JWT (access + refresh).
 * Access et refresh sont distingués par le claim {@code typ}, l'issuer est vérifié,
 * chaque token a un JTI pour la révocation (logout). Stockage "memory" (dev) ou Redis (prod).
 */
@Component
public class JwtUtils {

  private static final String ISSUER           = "juggleflow";
  private static final String CLAIM_TOKEN_TYPE = "typ";
  private static final String TYPE_ACCESS      = "access";
  private static final String TYPE_REFRESH     = "refresh";
  private static final String REDIS_KEY_PREFIX = "jwt:revoked:jti:";

  /**
   * Blacklist des JTI révoqués.
   * Chaque entrée est un UUID v4 unique généré à l'émission du token.
   * À remplacer par Redis en prod (TTL = expiration du token concerné).
   */
  private final Set<String> revokedTokenIds = ConcurrentHashMap.newKeySet();

  /**
   * Store de révocation :
   * - memory : Set en mémoire (dev uniquement, perdu au redémarrage)
   * - redis  : clés TTL en Redis (prod / multi-instances)
   */
  @Value("${app.jwt.revocation.store:memory}")
  private String revocationStore;

  @Autowired(required = false)
  private StringRedisTemplate redis;

  @Value("${jwt.secret}")
  private String secret;

  @Value("${jwt.expiration-ms}")
  private long expirationMs;

  @Value("${jwt.refresh-expiration-ms}")
  private long refreshExpirationMs;

  private SecretKey key;

  public JwtUtils() {}

  public JwtUtils(String secret, long expirationMs, long refreshExpirationMs) {
    this.secret = secret;
    this.expirationMs = expirationMs;
    this.refreshExpirationMs = refreshExpirationMs;
    init();
  }

  @PostConstruct
  public void init() {
    if (secret == null || secret.length() < 32) {
      throw new IllegalStateException(
        "jwt.secret doit contenir au moins 32 caractères. " +
          "Générez-en un avec : openssl rand -base64 64");
    }
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] keyBytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
      this.key = Keys.hmacShaKeyFor(keyBytes);
    } catch (Exception e) {
      throw new RuntimeException("Erreur lors de l'initialisation de la clé JWT", e);
    }
  }

  @PostConstruct
  void validateRevocationStoreConfig() {
    if ("redis".equalsIgnoreCase(revocationStore) && redis == null) {
      throw new IllegalStateException(
        "app.jwt.revocation.store=redis mais Redis n'est pas configuré. " +
          "Ajoutez spring-boot-starter-data-redis et définissez REDIS_HOST/REDIS_PORT.");
    }
  }


  public String generateToken(UserDetails userDetails) {
    return buildToken(userDetails, expirationMs, TYPE_ACCESS);
  }

  public String generateRefreshToken(UserDetails userDetails) {
    return buildToken(userDetails, refreshExpirationMs, TYPE_REFRESH);
  }

  private String buildToken(UserDetails userDetails, long expiration, String tokenType) {
    return Jwts.builder()
      .id(UUID.randomUUID().toString())
      .subject(userDetails.getUsername())
      .issuer(ISSUER)
      .claim(CLAIM_TOKEN_TYPE, tokenType)
      .issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis() + expiration))
      .signWith(key)
      .compact();
  }


  public String extractEmail(String token) {
    return extractClaim(token, Claims::getSubject);
  }

  public Date extractExpiration(String token) {
    return extractClaim(token, Claims::getExpiration);
  }

  public String extractTokenType(String token) {
    return extractClaim(token, c -> c.get(CLAIM_TOKEN_TYPE, String.class));
  }

  public <T> T extractClaim(String token, Function<Claims, T> resolver) {
    return resolver.apply(extractAllClaims(token));
  }

  private Claims extractAllClaims(String token) {
    return Jwts.parser()
      .verifyWith(key)
      .requireIssuer(ISSUER)
      .build()
      .parseSignedClaims(token)
      .getPayload();
  }


  public boolean isTokenValid(String token, UserDetails userDetails) {
    try {
      final String email     = extractEmail(token);
      final String tokenType = extractTokenType(token);

      if (!TYPE_ACCESS.equals(tokenType)) {
        return false;
      }

      String jti = extractClaim(token, Claims::getId);
      if (isRevoked(jti)) {
        return false;
      }

      return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
    } catch (JwtException | IllegalArgumentException e) {
      return false;
    }
  }

  public boolean isRefreshTokenValid(String token, UserDetails userDetails) {
    try {
      final String email     = extractEmail(token);
      final String tokenType = extractTokenType(token);

      if (!TYPE_REFRESH.equals(tokenType)) {
        return false;
      }

      String jti = extractClaim(token, Claims::getId);
      if (isRevoked(jti)) {
        return false;
      }

      return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
    } catch (JwtException | IllegalArgumentException e) {
      return false;
    }
  }

  /**
   * Révoque un token en ajoutant son JTI en blacklist (logout, rotation).
   */
  public void revokeToken(String token) {
    try {
      String jti = extractClaim(token, Claims::getId);
      if (!StringUtils.hasText(jti)) {
        return;
      }

      Date exp = extractExpiration(token);
      long ttlMs = exp.getTime() - System.currentTimeMillis();
      if (ttlMs <= 0) {
        return;
      }

      if ("redis".equalsIgnoreCase(revocationStore) && redis != null) {
        redis.opsForValue().set(REDIS_KEY_PREFIX + jti, "1", Duration.ofMillis(ttlMs));
      } else {
        revokedTokenIds.add(jti);
      }
    } catch (JwtException | IllegalArgumentException ignored) {
      // Token déjà invalide — pas besoin de le révoquer
    }
  }

  private boolean isRevoked(String jti) {
    if (!StringUtils.hasText(jti)) {
      return false;
    }

    if ("redis".equalsIgnoreCase(revocationStore) && redis != null) {
      Boolean exists = redis.hasKey(REDIS_KEY_PREFIX + jti);
      return Boolean.TRUE.equals(exists);
    }

    return revokedTokenIds.contains(jti);
  }

  private boolean isTokenExpired(String token) {
    return extractExpiration(token).before(new Date());
  }


  public long getExpirationMs() {
    return expirationMs;
  }
}
