package com.juggleflow.backend.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * Body de PUT /api/enseignant/classes/{classId}/groups/reorder :
 * liste exhaustive des identifiants de groupes, dans le nouvel ordre.
 * Le serveur vérifie que la liste correspond exactement aux groupes
 * de la classe (mêmes éléments, sans doublon).
 */
@Data
public class ReorderGroupsRequest {

    @NotEmpty(message = "La liste des groupes ne peut pas etre vide")
    private List<Long> groupIds;
}
