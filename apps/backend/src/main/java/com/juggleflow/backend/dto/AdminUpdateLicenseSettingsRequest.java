package com.juggleflow.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AdminUpdateLicenseSettingsRequest {

    @NotNull(message = "licenseSeatCap est obligatoire")
    @Min(value = 1, message = "Le plafond doit être au moins 1")
    @Max(value = 10_000, message = "Le plafond ne peut pas dépasser 10000")
    private Integer licenseSeatCap;

    /** Null = pas de date d'expiration. */
    private LocalDate licenseExpiresAt;
}
