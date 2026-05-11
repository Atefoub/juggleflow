// filename: backend/src/main/java/com/juggleflow/backend/dto/AssignPathRequest.java
package com.juggleflow.backend.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Body de POST /api/enseignant/classes/{classId}/paths.
 *
 * <p>Si {@link #studentIds} est {@code null} (champ omis), le parcours est
 * assigné à toute la classe via la table historique {@code class_learning_path}.
 *
 * <p>Si {@link #studentIds} est une liste non vide, le parcours est assigné
 * uniquement aux élèves cités via la table {@code learning_path_student_assignment}
 * (source {@code INDIVIDUAL}). Tous les élèves doivent appartenir à la classe.
 *
 * <p>Une liste vide ({@code []}) est invalide et provoque une erreur de validation
 * côté service ; on attend explicitement {@code null} pour signifier "toute la classe".
 */
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

    /**
     * Sous-ensemble d'élèves ciblés. {@code null} = toute la classe.
     * Non vide = assignation individuelle aux élèves listés.
     */
    private List<Long> studentIds;
}
