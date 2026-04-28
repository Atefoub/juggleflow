package com.juggleflow.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.SignatureAlgorithm;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtils {

  @Value("${jwt.secret}")
  private String secret;

  @Value("${jwt.expiration-ms}")
  private long expirationMs;

  @Value("${jwt.refresh-expiration-ms}")
  private long refreshExpirationMs;

  private SecretKey key;

  // ✅ Constructeur vide (Spring)
  public JwtUtils() {}

  // ✅ Constructeur pour les tests
  public JwtUtils(String secret, long expirationMs, long refreshExpirationMs) {
    this.secret = secret;
    this.expirationMs = expirationMs;
    this.refreshExpirationMs = refreshExpirationMs;
    init(); // important !
  }

  @PostConstruct
  public void init() {
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
    return buildToken(userDetails, expirationMs);
  }

  public String generateRefreshToken(UserDetails userDetails) {
    return buildToken(userDetails, refreshExpirationMs);
  }

  private String buildToken(UserDetails userDetails, long expiration) {
    return Jwts.builder()
      .subject(userDetails.getUsername())
      .issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis() + expiration))
      .signWith(key, SignatureAlgorithm.HS256)
      .compact();
  }

  // ===================== EXTRACTION =====================

  public String extractEmail(String token) {
    return extractClaim(token, Claims::getSubject);
  }

  public Date extractExpiration(String token) {
    return extractClaim(token, Claims::getExpiration);
  }

  public <T> T extractClaim(String token, Function<Claims, T> resolver) {
    Claims claims = extractAllClaims(token);
    return resolver.apply(claims);
  }

  private Claims extractAllClaims(String token) {
    return Jwts.parser()
      .verifyWith(key)
      .build()
      .parseSignedClaims(token)
      .getPayload();
  }

  // ===================== VALIDATION =====================

  public boolean isTokenValid(String token, UserDetails userDetails) {
    final String email = extractEmail(token);
    return email.equals(userDetails.getUsername()) && !isTokenExpired(token);
  }

  private boolean isTokenExpired(String token) {
    return extractExpiration(token).before(new Date());
  }

  // ===================== GETTERS =====================

  public long getExpirationMs() {
    return expirationMs;
  }
}
