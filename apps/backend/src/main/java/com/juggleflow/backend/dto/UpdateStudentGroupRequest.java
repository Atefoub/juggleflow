package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.StudentGroup;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * PATCH : tous les champs sont optionnels (null = non modifié).
 */
@Data
public class UpdateStudentGroupRequest {

    @Size(min = 1, max = 120, message = "Le nom du groupe doit comporter entre 1 et 120 caracteres")
    private String name;

    private StudentGroup.GroupColor color;
}
