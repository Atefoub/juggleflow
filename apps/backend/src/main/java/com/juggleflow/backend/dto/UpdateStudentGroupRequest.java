package com.juggleflow.backend.dto;

import com.juggleflow.backend.dto.StudentSummaryResponse.GroupColor;
import lombok.Data;

/**
 * Mise à jour du groupe pédagogique d'un élève.
 * {@code groupColor} à {@code null} : repasser au calcul automatique.
 */
@Data
public class UpdateStudentGroupRequest {

    private GroupColor groupColor;
}
