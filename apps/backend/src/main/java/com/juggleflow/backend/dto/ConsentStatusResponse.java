// filename: backend/src/main/java/com/juggleflow/backend/dto/ConsentStatusResponse.java
package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.GdprConsent.ConsentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ConsentStatusResponse {

    private Long userId;
    private String firstName;
    private String lastName;
    private boolean hasParentalConsent;
    private Instant consentDate;
    private String policyVersion;

    /**
     * Statut effectif du consentement parental.
     * - MISSING : aucun consentement enregistre (eleve a relancer).
     * - REVOKED : consentement explicitement revoque.
     * - EXPIRED : depasse expires_at OU policy_version obsolete.
     * - VALID   : actif et a jour.
     */
    private ConsentStatus status;

    /**
     * Date d'expiration du consentement (NULL = sans terme).
     */
    private Instant expiresAt;
}
