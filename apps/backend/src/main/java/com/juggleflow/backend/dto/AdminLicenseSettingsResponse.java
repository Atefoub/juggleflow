package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Paramètres de licence établissement (singleton id=1).
 */
@Value
@Builder
public class AdminLicenseSettingsResponse {

    String establishmentName;
    int licenseSeatCap;
    long licenseUsedCount;
    /** ISO-8601 (YYYY-MM-DD) ou null si pas d'expiration. */
    String licenseExpiresAt;
    boolean licenseExpired;
    boolean licenseAtCapacity;
}
