package com.juggleflow.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AssignPathToStudentRequest {

    @NotNull(message = "L'identifiant de l'élève est obligatoire")
    private Long studentId;

    @NotNull(message = "L'identifiant du parcours est obligatoire")
    private Long learningPathId;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDate startDate;

    private LocalDate expectedEndDate;
}
