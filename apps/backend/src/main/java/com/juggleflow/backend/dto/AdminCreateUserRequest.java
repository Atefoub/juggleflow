package com.juggleflow.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

/**
 * Requete de creation d'un utilisateur par un administrateur.
 *
 * Validation :
 *   - email : format RFC + max 255 (cf. colonne SQL).
 *   - role  : un des trois roles JuggleFlow exactement (whitelist stricte).
 *   - password : optionnel ; si vide, le serveur en genere un et le renvoie
 *     une seule fois dans la reponse pour transmission a l'utilisateur final.
 *   - classId / schoolLevel / birthDate : utilises uniquement quand
 *     role = ROLE_ELEVE.
 */
@Data
public class AdminCreateUserRequest {

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

    @NotBlank(message = "Le role est obligatoire")
    @Pattern(
        regexp = "ROLE_ELEVE|ROLE_ENSEIGNANT|ROLE_ADMINISTRATEUR",
        message = "Role invalide (ROLE_ELEVE, ROLE_ENSEIGNANT ou ROLE_ADMINISTRATEUR)"
    )
    private String role;

    @Size(min = 8, max = 128, message = "Le mot de passe doit comporter entre 8 et 128 caracteres")
    private String password;

    private Long classId;

    @Size(max = 50)
    private String schoolLevel;

    private LocalDate birthDate;
}
