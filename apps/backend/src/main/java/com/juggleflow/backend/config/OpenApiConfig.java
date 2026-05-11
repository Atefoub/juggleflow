package com.juggleflow.backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration OpenAPI / Swagger.
 *
 * [DOC-API-01] Déclaration globale du schéma de sécurité "bearerAuth".
 *
 * Tous les contrôleurs protégés référencent @SecurityRequirement(name = "bearerAuth")
 * (AdminController, GdprController, BadgeController, TrickController, etc.) mais le
 * schéma lui-même doit être déclaré UNE SEULE FOIS au niveau du document OpenAPI.
 * Sans cette déclaration, le bouton "Authorize" de Swagger UI n'affiche aucun champ
 * et les @SecurityRequirement des contrôleurs pointent dans le vide.
 *
 * Format du token attendu : un JWT (RFC 7519) émis par AuthService.login() / register()
 * et transmis dans l'en-tête HTTP : Authorization: Bearer &lt;token&gt;
 *
 * Cette classe est inerte si springdoc.api-docs.enabled=false (springdoc ne crée pas
 * l'OpenAPI bean dans ce cas), donc aucun impact en production.
 */
@Configuration
@OpenAPIDefinition(
  info = @Info(
    title = "JuggleFlow API",
    version = "v1",
    description = "API REST de la plateforme pédagogique JuggleFlow.",
    contact = @Contact(name = "JuggleFlow", url = "https://juggleflow.fr")
  )
)
@SecurityScheme(
  name = "bearerAuth",
  type = SecuritySchemeType.HTTP,
  scheme = "bearer",
  bearerFormat = "JWT",
  description = "JWT issu de POST /api/auth/login. À coller tel quel (sans le préfixe \"Bearer \")."
)
public class OpenApiConfig {
}
