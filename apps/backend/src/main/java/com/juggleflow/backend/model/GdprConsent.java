// filename: backend/src/main/java/com/juggleflow/backend/model/GdprConsent.java
package com.juggleflow.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Traçabilité complète du consentement RGPD.
 * Pour les mineurs, le champ consentType = PARENTAL_MINOR est obligatoire
 * et legalGuardian doit être renseigné.
 * Correspond à la table "gdpr_consent" du schéma PostgreSQL.
 */
@Entity
@Table(name = "gdpr_consent")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GdprConsent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "consent_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "consent_type", nullable = false, length = 30)
    private ConsentType consentType;

    @Column(name = "consent_given", nullable = false)
    private boolean consentGiven;

    @CreationTimestamp
    @Column(name = "consent_at", updatable = false)
    private Instant consentAt;

    @Column(name = "policy_version", nullable = false, length = 20)
    private String policyVersion;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * Représentant légal (parent/tuteur) — obligatoire si consentType = PARENTAL_MINOR.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "legal_guardian_id")
    private User legalGuardian;

    public enum ConsentType {
        DATA_USAGE,
        COMMUNICATION,
        COOKIES,
        PARENTAL_MINOR
    }
}
