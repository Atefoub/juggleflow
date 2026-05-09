package com.juggleflow.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Mise à jour partielle d'une classe (champs absents ou null = inchangé).
 */
@Data
public class AdminUpdateSchoolClassRequest {

    @Size(max = 100, message = "Le nom ne doit pas dépasser 100 caractères")
    private String name;

    @Pattern(
        regexp = "^(PS|MS|GS|CP|CE1|CE2|CM1|CM2)$",
        message = "Le niveau doit être : PS, MS, GS, CP, CE1, CE2, CM1 ou CM2"
    )
    private String schoolLevel;

    @Min(value = 2020, message = "L'année scolaire doit être >= 2020")
    @Max(value = 2100, message = "L'année scolaire doit être <= 2100")
    private Integer schoolYear;

    private Long homeroomTeacherId;
}
