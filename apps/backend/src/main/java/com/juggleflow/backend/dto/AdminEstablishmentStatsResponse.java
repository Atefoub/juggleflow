package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Value;

/** Vue agrégée de l'établissement pour le tableau de bord admin. */
@Value
@Builder
public class AdminEstablishmentStatsResponse {

    long classCount;
    long studentCount;
    long teacherAccountCount;
    long administratorAccountCount;
    long activeUserCount;
    Integer licenseSeatCap;
    long licenseUsedCount;
    /** ISO-8601 date ou null. */
    String licenseExpiresAt;
}
