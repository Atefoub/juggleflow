package com.juggleflow.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Inscription publique {@code POST /api/auth/register}.
 * En production : désactivée ; les comptes sont créés par l'administrateur.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.auth.public-registration")
public class AuthRegistrationProperties {

  /** false en prod : aucune auto-inscription. */
  private boolean enabled = true;

  /** false en prod : pas d'enseignant via register (même si enabled en dev). */
  private boolean allowTeacherRole = true;
}
