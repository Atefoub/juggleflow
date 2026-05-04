// filename: backend/src/main/java/com/juggleflow/backend/controller/GdprController.java
package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.ConsentRequest;
import com.juggleflow.backend.dto.ConsentStatusResponse;
import com.juggleflow.backend.model.GdprConsent.ConsentType;
import com.juggleflow.backend.service.GdprService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * CORRECTION RÉSIDUELLE [VULN-R1] :
 *
 * La méthode extractClientIp() utilisait X-Forwarded-For sans vérification
 * de proxy de confiance — identique à VULN-09 corrigée dans RateLimitFilter.
 *
 * Impact ici : un attaquant peut forger l'adresse IP enregistrée dans le
 * registre des consentements RGPD, compromettant la valeur légale des logs
 * de traçabilité (exigence RGPD Art. 7 et 30).
 *
 * CORRECTION : même logique que RateLimitFilter — lecture du header XFF
 * uniquement si APP_TRUSTED_PROXY=true, et on prend la DERNIÈRE IP
 * (ajoutée par le proxy de confiance) et non la première (forgeable).
 */
@RestController
@RequestMapping("/api/admin/gdpr")
@RequiredArgsConstructor
@Tag(name = "RGPD", description = "Conformité RGPD — consentements parentaux et exports")
@SecurityRequirement(name = "bearerAuth")
public class GdprController {

  private final GdprService gdprService;

  /**
   * GET /api/admin/gdpr/classes/{classId}/consents
   */
  @GetMapping("/classes/{classId}/consents")
  @Operation(summary = "Statut des consentements parentaux d'une classe")
  public ResponseEntity<List<ConsentStatusResponse>> getClassConsentStatus(
    @PathVariable Long classId,
    HttpServletRequest httpRequest) {

    String adminEmail = httpRequest.getUserPrincipal() != null
      ? httpRequest.getUserPrincipal().getName() : "unknown";

    return ResponseEntity.ok(
      gdprService.getClassConsentStatus(classId, adminEmail));
  }

  /**
   * POST /api/admin/gdpr/consents
   */
  @PostMapping("/consents")
  @Operation(summary = "Enregistrer un consentement RGPD")
  public ResponseEntity<ConsentStatusResponse> recordConsent(
    @Valid @RequestBody ConsentRequest request,
    HttpServletRequest httpRequest) {

    // [VULN-R1] IP extraite de façon sécurisée
    String ipAddress = extractClientIp(httpRequest);
    return ResponseEntity.ok(gdprService.recordConsent(request, ipAddress));
  }

  /**
   * DELETE /api/admin/gdpr/consents/{userId}/{consentType}
   */
  @DeleteMapping("/consents/{userId}/{consentType}")
  @Operation(summary = "Révoquer un consentement RGPD")
  public ResponseEntity<Void> revokeConsent(
    @PathVariable Long userId,
    @PathVariable ConsentType consentType,
    HttpServletRequest httpRequest) {

    String adminEmail = httpRequest.getUserPrincipal() != null
      ? httpRequest.getUserPrincipal().getName() : "unknown";

    gdprService.revokeConsent(userId, consentType, adminEmail);
    return ResponseEntity.noContent().build();
  }

  /**
   * GET /api/admin/gdpr/classes/{classId}/consents/export
   */
  @GetMapping("/classes/{classId}/consents/export")
  @Operation(summary = "Exporter le registre des consentements d'une classe")
  public ResponseEntity<List<ConsentStatusResponse>> exportConsentRegister(
    @PathVariable Long classId) {

    return ResponseEntity.ok(gdprService.exportConsentRegister(classId));
  }

  /**
   * GET /api/admin/gdpr/classes/{classId}/consents/pending-count
   */
  @GetMapping("/classes/{classId}/consents/pending-count")
  @Operation(summary = "Nombre de consentements parentaux manquants dans une classe")
  public ResponseEntity<Map<String, Long>> getPendingCount(@PathVariable Long classId) {
    long count = gdprService.getPendingConsentsCount(classId);
    return ResponseEntity.ok(Map.of("pendingCount", count));
  }

  // ── Helper : extraction IP derrière proxy ─────────────────────────────────

  /**
   * [VULN-R1] Extraction sécurisée de l'IP cliente pour la traçabilité RGPD.
   *
   * L'ancienne implémentation lisait xForwardedFor.split(",")[0] sans vérification,
   * permettant à n'importe quel client de forger l'IP enregistrée dans les logs
   * de consentement — ce qui invalide leur valeur probatoire légale.
   *
   * Même logique que RateLimitFilter.getClientIp() :
   * - Sans proxy de confiance (défaut) → request.getRemoteAddr() (IP TCP réelle)
   * - Avec proxy de confiance (APP_TRUSTED_PROXY=true) → dernière IP du XFF header
   *   (ajoutée par le proxy, non forgeable par le client)
   */
  private String extractClientIp(HttpServletRequest request) {
    boolean trustedProxy = Boolean.parseBoolean(
      System.getProperty("app.trusted-proxy",
        System.getenv().getOrDefault("APP_TRUSTED_PROXY", "false")));

    if (trustedProxy) {
      String xForwardedFor = request.getHeader("X-Forwarded-For");
      if (xForwardedFor != null && !xForwardedFor.isBlank()) {
        // Dernière entrée = ajoutée par le proxy de confiance (non forgeable)
        String[] parts = xForwardedFor.split(",");
        return parts[parts.length - 1].trim();
      }
    }
    return request.getRemoteAddr();
  }
}
