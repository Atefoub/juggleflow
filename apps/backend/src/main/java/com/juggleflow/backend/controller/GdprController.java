package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.ConsentRequest;
import com.juggleflow.backend.dto.ConsentStatusResponse;
import com.juggleflow.backend.model.GdprConsent.ConsentType;
import com.juggleflow.backend.service.AdminAuditService;
import com.juggleflow.backend.service.GdprService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
 * Endpoints d'administration RGPD : consentements parentaux, révocations et exports.
 *
 * Tous les endpoints sont protégés par ROLE_ADMINISTRATEUR (déclaré dans SecurityConfig).
 *
 * Corrections de sécurité appliquées :
 *
 * [VULN-R1] extractClientIp() utilisait X-Forwarded-For sans vérification de proxy
 *           de confiance, permettant à un attaquant de forger l'adresse IP enregistrée
 *           dans le registre des consentements RGPD — ce qui compromet leur valeur
 *           probatoire légale (RGPD Art. 7 et 30).
 *           CORRECTION : même logique sécurisée que RateLimitFilter.
 *
 * [FIX-TRUSTEDPROXY] CORRECTION 04/05/2026 — extractClientIp() lisait app.trusted-proxy
 *                     via System.getProperty() / System.getenv(), contournant la gestion
 *                     centralisée Spring Boot. Alignement sur RateLimitFilter :
 *                     injection via @Value("${app.trusted-proxy:false}").
 *
 * [FIX-SWAGGER-ALIGN] Route /pending-count renommée en /pending pour correspondre
 *                     au Swagger généré (summary "Nombre de consentements parentaux
 *                     manquants"). Les deux noms étaient incohérents entre le path
 *                     HTTP et la documentation.
 */
@RestController
@RequestMapping("/api/admin/gdpr")
@RequiredArgsConstructor
@Tag(name = "RGPD", description = "Conformité RGPD — consentements parentaux et exports")
@SecurityRequirement(name = "bearerAuth")
public class GdprController {

  private final GdprService gdprService;
  private final AdminAuditService adminAuditService;

  /**
   * [FIX-TRUSTEDPROXY] Injecté par Spring depuis application.properties.
   * Valeur par défaut : false (sécurisé — IP TCP utilisée sans proxy configuré).
   */
  @Value("${app.trusted-proxy:false}")
  private boolean trustedProxy;


  /**
   * GET /api/admin/gdpr/classes/{classId}/consents
   * Retourne le statut des consentements parentaux de tous les élèves d'une classe.
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
   * Enregistre un consentement RGPD avec l'adresse IP extraite de façon sécurisée.
   */
  @PostMapping("/consents")
  @Operation(summary = "Enregistrer un consentement RGPD")
  public ResponseEntity<ConsentStatusResponse> recordConsent(
    @Valid @RequestBody ConsentRequest request,
    HttpServletRequest httpRequest,
    @AuthenticationPrincipal UserDetails principal) {

    // [VULN-R1] + [FIX-TRUSTEDPROXY] IP extraite de façon sécurisée
    String ipAddress = extractClientIp(httpRequest);
    ConsentStatusResponse saved = gdprService.recordConsent(request, ipAddress);
    String actor = principal != null ? principal.getUsername()
      : (httpRequest.getUserPrincipal() != null ? httpRequest.getUserPrincipal().getName() : "unknown");
    adminAuditService.record(
      actor,
      "GDPR_CONSENT_RECORDED",
      "userId=" + request.getUserId() + ", type=" + request.getConsentType() + ", given=" + request.getConsentGiven());
    return ResponseEntity.ok(saved);
  }

  /**
   * DELETE /api/admin/gdpr/consents/{userId}/{consentType}
   * Révoque un consentement RGPD pour un utilisateur donné.
   */
  @DeleteMapping("/consents/{userId}/{consentType}")
  @Operation(summary = "Révoquer un consentement RGPD")
  public ResponseEntity<Void> revokeConsent(
    @PathVariable Long userId,
    @PathVariable ConsentType consentType,
    HttpServletRequest httpRequest,
    @AuthenticationPrincipal UserDetails principal) {

    String adminEmail = principal != null ? principal.getUsername()
      : (httpRequest.getUserPrincipal() != null ? httpRequest.getUserPrincipal().getName() : "unknown");

    gdprService.revokeConsent(userId, consentType, adminEmail);
    adminAuditService.record(
      adminEmail,
      "GDPR_CONSENT_REVOKED",
      "userId=" + userId + ", type=" + consentType);
    return ResponseEntity.noContent().build();
  }

  /**
   * GET /api/admin/gdpr/classes/{classId}/consents/export
   * Exporte le registre complet des consentements d'une classe.
   */
  @GetMapping("/classes/{classId}/consents/export")
  @Operation(summary = "Exporter le registre des consentements d'une classe")
  public ResponseEntity<List<ConsentStatusResponse>> exportConsentRegister(
    @PathVariable Long classId) {

    return ResponseEntity.ok(gdprService.exportConsentRegister(classId));
  }

  /**
   * GET /api/admin/gdpr/classes/{classId}/consents/pending
   * Retourne le nombre de consentements parentaux manquants dans une classe.
   *
   * [FIX-SWAGGER-ALIGN] Renommé de /pending-count → /pending pour cohérence
   * avec le Swagger (le suffixe "-count" était redondant avec le champ
   * "pendingCount" dans le body de réponse).
   */
  @GetMapping("/classes/{classId}/consents/pending")
  @Operation(summary = "Nombre de consentements parentaux manquants")
  public ResponseEntity<Map<String, Long>> getPendingCount(@PathVariable Long classId) {
    long count = gdprService.getPendingConsentsCount(classId);
    return ResponseEntity.ok(Map.of("pendingCount", count));
  }

  /**
   * GET /api/admin/gdpr/classes/{classId}/consents/export.pdf
   * Export PDF du registre des consentements (a archiver / a presenter au DPO).
   *
   * Content-Type : application/pdf ; Content-Disposition : attachment pour
   * forcer le telechargement par le navigateur. Un evenement d'audit est
   * enregistre (tracabilite RGPD : qui a telecharge le registre, quand,
   * pour quelle classe).
   */
  @GetMapping(value = "/classes/{classId}/consents/export.pdf",
              produces = MediaType.APPLICATION_PDF_VALUE)
  @Operation(summary = "Exporter le registre des consentements (PDF)")
  public ResponseEntity<byte[]> exportConsentRegisterPdf(
      @PathVariable Long classId,
      @AuthenticationPrincipal UserDetails principal,
      HttpServletRequest httpRequest) {

    byte[] pdf = gdprService.exportConsentRegisterPdf(classId);
    String actor = principal != null ? principal.getUsername()
      : (httpRequest.getUserPrincipal() != null ? httpRequest.getUserPrincipal().getName() : "unknown");
    adminAuditService.record(
      actor,
      "GDPR_CONSENT_REGISTER_EXPORTED_PDF",
      "classId=" + classId + ", bytes=" + pdf.length);

    String filename = "consents_class_" + classId + ".pdf";
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
      .header(HttpHeaders.CONTENT_DISPOSITION,
        "attachment; filename=\"" + filename + "\"")
      .body(pdf);
  }


  /**
   * Extraction sécurisée de l'IP cliente pour la traçabilité RGPD.
   *
   * [VULN-R1] L'ancienne implémentation lisait xForwardedFor.split(",")[0] sans
   *           vérification, permettant à n'importe quel client de forger l'IP
   *           enregistrée dans les logs de consentement.
   *
   * [FIX-TRUSTEDPROXY] Le flag trustedProxy est désormais injecté via @Value
   *                     (Spring Boot) au lieu de System.getProperty().
   *
   * Comportement :
   * - Sans proxy de confiance (défaut) → request.getRemoteAddr() : IP TCP réelle.
   * - Avec proxy de confiance (app.trusted-proxy=true) → DERNIÈRE IP du header
   *   X-Forwarded-For (ajoutée par le proxy, non forgeable par le client).
   *
   * Pourquoi la DERNIÈRE IP ? Le header XFF est construit en append :
   * "IP-client, proxy1, proxy2". La première est fournie par le client (forgeable).
   * La dernière est ajoutée par le reverse-proxy de confiance (fiable).
   */
  private String extractClientIp(HttpServletRequest request) {
    if (trustedProxy) {
      String xForwardedFor = request.getHeader("X-Forwarded-For");
      if (xForwardedFor != null && !xForwardedFor.isBlank()) {
        String[] parts = xForwardedFor.split(",");
        return parts[parts.length - 1].trim();
      }
    }
    return request.getRemoteAddr();
  }
}
