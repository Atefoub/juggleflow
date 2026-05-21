package com.juggleflow.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * Gestion des tokens JWT (access + refresh).
 * Access et refresh sont distingués par le claim {@code typ}, l'issuer est vérifié,
 * chaque token a un JTI pour la révocation (logout). Blacklist en mémoire ;
 * TODO prod : Redis avec TTL = durée de vie du token.
 */
@Component
public class JwtUtils {

  private static final String ISSUER           = "juggleflow";
  private static final String CLAIM_TOKEN_TYPE = "typ";
  private static final String TYPE_ACCESS      = "access";
  private static final String TYPE_REFRESH     = "refresh";

  /**
   * Blacklist des JTI révoqués.
   * Chaque entrée est un UUID v4 unique généré à l'émission du token.
   * À remplacer par Redis en prod (TTL = expiration du token concerné).
   */
  private final Set<String> revokedTokenIds = ConcurrentHashMap.newKeySet();

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
      if (jti != null && revokedTokenIds.contains(jti)) {
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
      if (jti != null && revokedTokenIds.contains(jti)) {
        return false;
      }

      return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
    } catch (JwtException | IllegalArgumentException e) {
      return false;
    }
  }

  /**
   * Révoque un token en ajoutant son JTI en blacklist (logout, rotation).
   * TODO prod : Redis avec TTL = durée de vie restante du token.
   */
  public void revokeToken(String token) {
    try {
      String jti = extractClaim(token, Claims::getId);
      if (jti != null) {
        revokedTokenIds.add(jti);
      }
    } catch (JwtException | IllegalArgumentException ignored) {
      // Token déjà invalide — pas besoin de le révoquer
    }
  }

  private boolean isTokenExpired(String token) {
    return extractExpiration(token).before(new Date());
  }


  public long getExpirationMs() {
    return expirationMs;
  }
}
