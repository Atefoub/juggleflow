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
    /** Groupe effectif (manuel ou automatique). */
    private GroupColor groupColor;
    /** Groupe suggéré par la progression, sans override enseignant. */
    private GroupColor groupColorAuto;
    /** {@code true} si l'enseignant a fixé le groupe manuellement. */
    private boolean groupColorManual;

    /** Bloqué sur la figure courante du parcours assigné (≥ 3 tentatives). */
    private boolean blocked;
    private Long blockedTrickId;
    private String blockedTrickName;
    private Integer blockedAttemptCount;

    /** Couleur de groupe : >= 70% VERT, >= 40% ORANGE, sinon ROUGE. */
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
