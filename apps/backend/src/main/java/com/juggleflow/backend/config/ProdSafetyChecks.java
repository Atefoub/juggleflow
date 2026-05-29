package com.juggleflow.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import jakarta.annotation.PostConstruct;

/**
 * Fail-fast en production : empêche un déploiement avec des réglages "dev"
 * (bootstrap démo, secrets faibles, stores non distribués, etc.).
 */
@Component
@Profile("prod")
public class ProdSafetyChecks {

  @Value("${jwt.secret:}")
  private String jwtSecret;

  @Value("${cookie.secure:true}")
  private boolean cookieSecure;

  @Value("${demo.bootstrap.enabled:false}")
  private boolean demoBootstrapEnabled;

  @Value("${springdoc.swagger-ui.enabled:false}")
  private boolean swaggerUiEnabled;

  @Value("${springdoc.api-docs.enabled:false}")
  private boolean apiDocsEnabled;

  @Value("${app.jwt.revocation.store:memory}")
  private String revocationStore;

  @Value("${app.rate-limit.store:memory}")
  private String rateLimitStore;

  @Value("${app.auth.public-registration.enabled:false}")
  private boolean publicRegistrationEnabled;

  @PostConstruct
  void validate() {
    if (!StringUtils.hasText(jwtSecret) || jwtSecret.length() < 32) {
      throw new IllegalStateException("JWT_SECRET doit être défini (>= 32 caractères) en production.");
    }

    if (!cookieSecure) {
      throw new IllegalStateException("COOKIE_SECURE doit être true en production (HTTPS obligatoire).");
    }

    if (demoBootstrapEnabled) {
      throw new IllegalStateException("DEMO_BOOTSTRAP_ENABLED ne doit jamais être true en production.");
    }

    if (swaggerUiEnabled || apiDocsEnabled) {
      throw new IllegalStateException("Swagger/OpenAPI doit rester désactivé en production.");
    }

    if (!"redis".equalsIgnoreCase(revocationStore) || !"redis".equalsIgnoreCase(rateLimitStore)) {
      throw new IllegalStateException("En production, app.jwt.revocation.store et app.rate-limit.store doivent être à 'redis'.");
    }

    if (publicRegistrationEnabled) {
      throw new IllegalStateException(
        "app.auth.public-registration.enabled doit être false en production.");
    }
  }
}

