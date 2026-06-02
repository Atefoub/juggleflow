package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Réponse enseignant : création d'un compte élève.
 *
 * Le mot de passe généré est retourné UNE SEULE FOIS et ne doit pas être stocké.
 */
@Data
@Builder
public class TeacherCreateStudentResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private Long classId;
    private String className;
    private String generatedPassword;
}

