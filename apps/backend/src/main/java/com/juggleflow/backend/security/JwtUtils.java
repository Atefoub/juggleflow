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
 *
 * Corrections de sécurité appliquées :
 *
 * [VULN-01] Suppression de SignatureAlgorithm.HS256 (API dépréciée JJWT 0.12+).
 *           signWith(key) avec SecretKey déduit automatiquement HS256 et empêche
 *           tout downgrade vers alg:none.
 *
 * [VULN-02] Claim "typ" : "access" / "refresh" pour distinguer les deux types de
 *           tokens. Le filtre JWT rejette les refresh tokens présentés comme access.
 *
 * [VULN-03] Issuer "juggleflow" inclus et vérifié à chaque parsing.
 *
 * [VULN-04] Blacklist in-memory (ConcurrentHashSet) pour les tokens révoqués (logout).
 *           TODO prod : migrer vers Redis avec TTL = durée de vie du token.
 *
 * [VULN-05] Secret JWT minimum 32 caractères enforced au démarrage via @PostConstruct.
 *
 * [FIX-JTI] CORRECTION 04/05/2026 — Le JTI (JWT ID) n'était pas généré dans
 *            buildToken(), rendant la blacklist inopérante pour les access tokens
 *            (Claims::getId() retournait null). Désormais chaque token reçoit un
 *            UUID v4 unique via .id(UUID.randomUUID().toString()). La blacklist
 *            fonctionne maintenant pour les deux types de tokens.
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

  // ── Constructeur Spring ─────────────────────────────────────────────────────
  public JwtUtils() {}

  // ── Constructeur pour les tests unitaires ───────────────────────────────────
  public JwtUtils(String secret, long expirationMs, long refreshExpirationMs) {
    this.secret = secret;
    this.expirationMs = expirationMs;
    this.refreshExpirationMs = refreshExpirationMs;
    init();
  }

  @PostConstruct
  public void init() {
    // [VULN-05] Longueur minimale enforced au démarrage — l'application refuse
    // de démarrer avec un secret trop court.
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

  // ── Génération ──────────────────────────────────────────────────────────────

  public String generateToken(UserDetails userDetails) {
    return buildToken(userDetails, expirationMs, TYPE_ACCESS);
  }

  public String generateRefreshToken(UserDetails userDetails) {
    return buildToken(userDetails, refreshExpirationMs, TYPE_REFRESH);
  }

  /**
   * Construit un token JWT signé.
   *
   * [VULN-01] signWith(key) sans algorithme explicite : JJWT 0.12+ déduit HS256
   *           depuis le type SecretKey — pas de downgrade possible.
   * [VULN-02] Claim "typ" discrimine access vs refresh.
   * [VULN-03] Issuer "juggleflow" systématiquement inclus.
   * [FIX-JTI] .id(UUID) : chaque token reçoit un identifiant unique, ce qui
   *            rend la blacklist opérationnelle pour les access tokens également.
   */
  private String buildToken(UserDetails userDetails, long expiration, String tokenType) {
    return Jwts.builder()
      .id(UUID.randomUUID().toString())          // [FIX-JTI] JTI unique par token
      .subject(userDetails.getUsername())
      .issuer(ISSUER)                            // [VULN-03]
      .claim(CLAIM_TOKEN_TYPE, tokenType)        // [VULN-02]
      .issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis() + expiration))
      .signWith(key)                             // [VULN-01] — algorithme déduit automatiquement
      .compact();
  }

  // ── Extraction ──────────────────────────────────────────────────────────────

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

  /**
   * [VULN-03] requireIssuer() : tout token sans l'issuer attendu est rejeté.
   */
  private Claims extractAllClaims(String token) {
    return Jwts.parser()
      .verifyWith(key)
      .requireIssuer(ISSUER)
      .build()
      .parseSignedClaims(token)
      .getPayload();
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  /**
   * Valide un access token.
   *
   * [VULN-02] Rejet explicite si le claim "typ" n'est pas "access".
   * [VULN-04] Vérification de la blacklist via le JTI.
   * [FIX-JTI] Désormais efficace sur les access tokens (JTI présent).
   */
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

  /**
   * Valide un refresh token.
   *
   * [VULN-02] Rejet explicite si le claim "typ" n'est pas "refresh".
   * [VULN-04] Vérification de la blacklist via le JTI.
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
   * Révoque un token en ajoutant son JTI en blacklist (logout, rotation).
   *
   * [VULN-04] Révocation par JTI.
   * [FIX-JTI] Désormais efficace sur les access tokens et les refresh tokens.
   *
   * TODO prod : stocker dans Redis avec TTL = expiration du token concerné.
   *             Exemple : redisTemplate.opsForValue().set("revoked:" + jti, "1",
   *                         Duration.ofMillis(remainingMs));
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

  // ── Accesseurs ──────────────────────────────────────────────────────────────

  public long getExpirationMs() {
    return expirationMs;
  }
}
