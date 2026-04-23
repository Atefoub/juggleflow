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

@RestController
@RequestMapping("/api/admin/gdpr")
@RequiredArgsConstructor
@Tag(name = "RGPD", description = "Conformité RGPD — consentements parentaux et exports")
@SecurityRequirement(name = "bearerAuth")
public class GdprController {

    private final GdprService gdprService;

    /**
     * GET /api/admin/gdpr/classes/{classId}/consents
     * Statut du consentement parental de chaque élève de la classe.
     * Alimente les 3 compteurs de l'écran Admin RGPD (wireframe 17).
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
     * Enregistre ou met à jour un consentement RGPD.
     * L'adresse IP est capturée automatiquement pour la traçabilité légale.
     */
    @PostMapping("/consents")
    @Operation(summary = "Enregistrer un consentement RGPD")
    public ResponseEntity<ConsentStatusResponse> recordConsent(
            @Valid @RequestBody ConsentRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = extractClientIp(httpRequest);
        return ResponseEntity.ok(gdprService.recordConsent(request, ipAddress));
    }

    /**
     * DELETE /api/admin/gdpr/consents/{userId}/{consentType}
     * Révoque un consentement. Si consentType = PARENTAL_MINOR,
     * le compte de l'élève est immédiatement désactivé.
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
     * Retourne le registre complet des consentements d'une classe
     * au format JSON, prêt pour export CSV côté client.
     */
    @GetMapping("/classes/{classId}/consents/export")
    @Operation(summary = "Exporter le registre des consentements d'une classe")
    public ResponseEntity<List<ConsentStatusResponse>> exportConsentRegister(
            @PathVariable Long classId) {

        return ResponseEntity.ok(gdprService.exportConsentRegister(classId));
    }

    /**
     * GET /api/admin/gdpr/classes/{classId}/consents/pending-count
     * Nombre d'élèves sans consentement parental accordé.
     * Alimente le bouton "Relancer (N)" de l'écran Admin RGPD (wireframe 17).
     */
    @GetMapping("/classes/{classId}/consents/pending-count")
    @Operation(summary = "Nombre de consentements parentaux manquants dans une classe")
    public ResponseEntity<Map<String, Long>> getPendingCount(@PathVariable Long classId) {
        long count = gdprService.getPendingConsentsCount(classId);
        return ResponseEntity.ok(Map.of("pendingCount", count));
    }

    // ── Helper : extraction IP derrière proxy ────────────────────

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
