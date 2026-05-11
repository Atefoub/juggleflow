// filename: backend/src/main/java/com/juggleflow/backend/dto/ConsentRequest.java
package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.GdprConsent.ConsentType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConsentRequest {

    @NotNull(message = "L'identifiant de l'utilisateur est obligatoire")
    private Long userId;

    @NotNull(message = "Le type de consentement est obligatoire")
    private ConsentType consentType;

    @NotNull(message = "La valeur du consentement est obligatoire")
    private Boolean consentGiven;

    @NotBlank(message = "La version de la politique de confidentialité est obligatoire")
    private String policyVersion;

    /**
     * Identifiant du représentant légal.
     * Obligatoire uniquement si consentType = PARENTAL_MINOR.
     */
    private Long legalGuardianId;

    /**
     * Date d'expiration optionnelle. Si null, le service utilise
     * {@code gdpr.consent-default-validity-days} jours apres la saisie.
     */
    private java.time.Instant expiresAt;

    /**
     * Validation croisée : le consentement parental exige un représentant légal identifié.
     */
    @AssertTrue(
        message = "Le consentement parental (PARENTAL_MINOR) "
                + "requiert l'identifiant du représentant légal"
    )
    public boolean isLegalGuardianProvidedWhenRequired() {
        if (consentType == null) return true;
        if (consentType == ConsentType.PARENTAL_MINOR) {
            return legalGuardianId != null;
        }
        return true;
    }
}
