package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentLookupResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private Long currentClassId;
    private String currentClassName;
    /** {@code true} si {@code classId} a été fourni et que l'élève y est déjà inscrit. */
    private boolean alreadyInClass;
}
