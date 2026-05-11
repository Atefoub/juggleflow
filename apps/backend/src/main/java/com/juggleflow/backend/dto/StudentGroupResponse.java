package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.StudentGroup;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

/**
 * Représentation d'un groupe pédagogique nommé renvoyée côté UI enseignant.
 */
@Data
@Builder
public class StudentGroupResponse {

    private Long id;
    private Long classId;
    private String name;
    private StudentGroup.GroupColor color;
    private int position;
    private Instant createdAt;
    private Instant updatedAt;
    /** Identifiants des élèves membres (l'UI joint avec la liste des élèves). */
    private List<Long> memberIds;
    private int memberCount;
}
