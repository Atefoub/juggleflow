// filename: backend/src/main/java/com/juggleflow/backend/dto/AssignPathRequest.java
package com.juggleflow.backend.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AssignPathRequest {

    @NotNull(message = "L'identifiant du parcours est obligatoire")
    private Long learningPathId;

    @NotNull(message = "L'identifiant de la classe est obligatoire")
    private Long classId;

    @NotNull(message = "La date de début est obligatoire")
    @FutureOrPresent(message = "La date de début ne peut pas être dans le passé")
    private LocalDate startDate;

    private LocalDate expectedEndDate;
}
