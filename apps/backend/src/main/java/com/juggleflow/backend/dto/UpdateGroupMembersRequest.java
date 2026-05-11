package com.juggleflow.backend.dto;

import lombok.Data;

import java.util.List;

/**
 * Body de PUT /api/enseignant/classes/{classId}/groups/{groupId}/members :
 * remplace intégralement la liste des membres du groupe par celle fournie.
 * Une liste vide retire tous les membres.
 */
@Data
public class UpdateGroupMembersRequest {

    /** Liste des identifiants d'élèves. Peut être vide, ne peut pas être {@code null}. */
    private List<Long> studentIds = List.of();
}
