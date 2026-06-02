package com.juggleflow.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Requête enseignant : création d'un compte élève rattaché à une classe.
 *
 * Convention :
 * - Le mot de passe n'est pas fourni par l'enseignant : il est généré par le serveur
 *   et renvoyé UNE SEULE FOIS dans la réponse.
 */
@Data
public class TeacherCreateStudentRequest {

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Email invalide")
    @Size(max = 255)
    private String email;

    @NotBlank(message = "Le prenom est obligatoire")
    @Size(max = 100)
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100)
    private String lastName;
}

