package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Vue agrégée de l'établissement pour le tableau de bord admin.
 * {@code licenseSeatCap} est réservé à une future gestion de quotas (null = non configuré).
 */
@Value
@Builder
public class AdminEstablishmentStatsResponse {

    long classCount;
    long studentCount;
    long teacherAccountCount;
    long administratorAccountCount;
    long activeUserCount;
    Integer licenseSeatCap;
}
