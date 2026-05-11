package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.StudentGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateStudentGroupRequest {

    @NotBlank(message = "Le nom du groupe est obligatoire")
    @Size(max = 120, message = "Le nom du groupe ne peut pas depasser 120 caracteres")
    private String name;

    @NotNull(message = "La couleur du groupe est obligatoire")
    private StudentGroup.GroupColor color;
}
