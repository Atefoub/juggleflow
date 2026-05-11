package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminUserResponse {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private boolean enabled;

    /**
     * Présent uniquement pour les élèves.
     */
    private Long classId;
    private String className;

    /**
     * Statut du consentement parental pour un élève.
     * - ok      : consentement PARENTAL_MINOR accordé et à jour
     * - expired : consentement présent mais expiré (date d'expiration dépassée
     *             ou policy_version obsolète)
     * - missing : consentement absent, non accordé ou révoqué
     * - none    : non applicable (enseignant / admin)
     */
    private String parentalConsentStatus;
}

