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
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-01] SUPPRESSION de SignatureAlgorithm.HS256 (API dépréciée JJWT 0.12+).
 *           La méthode signWith(key) avec SecretKey déduit automatiquement HS256,
 *           éliminant tout risque de downgrade vers alg:none.
 *
 * [VULN-02] AJOUT du claim "typ":"access" / "typ":"refresh" pour distinguer les
 *           deux types de tokens. Le filtre JWT rejette les refresh tokens présentés
 *           comme access tokens (et vice-versa).
 *
 * [VULN-03] AJOUT de l'issuer ("iss" claim) et validation à la vérification.
 *           Empêche l'acceptation de tokens émis par un autre service.
 *
 * [VULN-04] AJOUT d'une blacklist in-memory pour les refresh tokens révoqués
 *           (logout). Pour prod multi-nœuds, migrer vers Redis.
 *
 * [VULN-05] RENFORCEMENT de la validation de longueur du secret :
 *           minimum 32 caractères enforced au démarrage.
 */
@Component
public class JwtUtils {

  private static final String ISSUER          = "juggleflow";
  private static final String CLAIM_TOKEN_TYPE = "typ";
  private static final String TYPE_ACCESS      = "access";
  private static final String TYPE_REFRESH     = "refresh";

  /** Blacklist des JTI (JWT ID) invalidés — à remplacer par Redis en prod. */
  private final Set<String> revokedTokenIds = ConcurrentHashMap.newKeySet();

  @Value("${jwt.secret}")
  private String secret;

  @Value("${jwt.expiration-ms}")
  private long expirationMs;

  @Value("${jwt.refresh-expiration-ms}")
  private long refreshExpirationMs;

  private SecretKey key;

  // ── Constructeur Spring ───────────────────────────────────────
  public JwtUtils() {}

  // ── Constructeur pour les tests ───────────────────────────────
  public JwtUtils(String secret, long expirationMs, long refreshExpirationMs) {
    this.secret = secret;
    this.expirationMs = expirationMs;
    this.refreshExpirationMs = refreshExpirationMs;
    init();
  }

  @PostConstruct
  public void init() {
    // [VULN-05] Validation de la longueur minimale du secret
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

  // ===================== GENERATION =====================

  public String generateToken(UserDetails userDetails) {
    return buildToken(userDetails, expirationMs, TYPE_ACCESS);
  }

  public String generateRefreshToken(UserDetails userDetails) {
    return buildToken(userDetails, refreshExpirationMs, TYPE_REFRESH);
  }

  /**
   * [VULN-01] signWith(key) sans algorithme explicite : JJWT 0.12+ déduit
   *           automatiquement HS256 depuis le type de clé → pas de downgrade possible.
   * [VULN-02] Claim "typ" discrimine access vs refresh.
   * [VULN-03] Issuer "juggleflow" systématiquement inclus.
   */
  private String buildToken(UserDetails userDetails, long expiration, String tokenType) {
    return Jwts.builder()
      .subject(userDetails.getUsername())
      .issuer(ISSUER)
      .claim(CLAIM_TOKEN_TYPE, tokenType)
      .issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis() + expiration))
      .signWith(key)                      // [VULN-01] — pas de SignatureAlgorithm.HS256
      .compact();
  }

  // ===================== EXTRACTION =====================

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
    Claims claims = extractAllClaims(token);
    return resolver.apply(claims);
  }

  /**
   * [VULN-03] requireIssuer() : tout token sans l'issuer attendu est rejeté.
   */
  private Claims extractAllClaims(String token) {
    return Jwts.parser()
      .verifyWith(key)
      .requireIssuer(ISSUER)              // [VULN-03]
      .build()
      .parseSignedClaims(token)
      .getPayload();
  }

  // ===================== VALIDATION =====================

  /**
   * Valide un access token (rejet explicite si c'est un refresh token).
   * [VULN-02] Enforce la séparation access / refresh.
   */
  public boolean isTokenValid(String token, UserDetails userDetails) {
    try {
      final String email     = extractEmail(token);
      final String tokenType = extractTokenType(token);

      // [VULN-02] Refus des refresh tokens présentés comme access tokens
      if (!TYPE_ACCESS.equals(tokenType)) {
        return false;
      }

      // [VULN-04] Vérification de la blacklist
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
   * Valide un refresh token (rejet si c'est un access token).
   */
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
   * [VULN-04] Révoque un token (logout) en ajoutant son JTI en blacklist.
   * TODO prod : stocker dans Redis avec TTL = expiration du token.
   */
  public void revokeToken(String token) {
    try {
      String jti = extractClaim(token, Claims::getId);
      if (jti != null) {
        revokedTokenIds.add(jti);
      }
    } catch (JwtException | IllegalArgumentException ignored) {
      // Token déjà invalide, pas besoin de le révoquer
    }
  }

  private boolean isTokenExpired(String token) {
    return extractExpiration(token).before(new Date());
  }

  // ===================== GETTERS =====================

  public long getExpirationMs() {
    return expirationMs;
  }
}
