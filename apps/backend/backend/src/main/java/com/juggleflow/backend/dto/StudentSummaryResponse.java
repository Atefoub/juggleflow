// filename: backend/src/main/java/com/juggleflow/backend/dto/StudentSummaryResponse.java
package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class StudentSummaryResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private int progressionPercent;
    private Instant lastActivityAt;
    private GroupColor groupColor;

    /**
     * Couleur de groupe calculée selon la progression :
     * >= 70% → VERT, >= 40% → ORANGE, < 40% → ROUGE.
     * Cohérence avec les wireframes 07 et 12.
     */
    public enum GroupColor {
        VERT,
        ORANGE,
        ROUGE
    }

    /**
     * Détermine la couleur de groupe à partir d'un pourcentage de progression.
     *
     * @param percent le pourcentage de figures maîtrisées (0-100)
     * @return la couleur de groupe correspondante
     */
    public static GroupColor resolveGroupColor(int percent) {
        if (percent >= 70) return GroupColor.VERT;
        if (percent >= 40) return GroupColor.ORANGE;
        return GroupColor.ROUGE;
    }
}
