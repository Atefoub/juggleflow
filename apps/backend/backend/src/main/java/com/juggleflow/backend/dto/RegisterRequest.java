package com.juggleflow.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @Email(message = "Email invalide")
    @NotBlank(message = "Email obligatoire")
    private String email;

    @NotBlank(message = "Mot de passe obligatoire")
    @Size(min = 8, message = "Mot de passe : 8 caractères minimum")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
        message = "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre"
    )
    private String password;

    @NotBlank(message = "Prénom obligatoire")
    @Size(max = 100)
    private String firstName;

    @NotBlank(message = "Nom obligatoire")
    @Size(max = 100)
    private String lastName;

    /**
     * Rôle attendu : "student", "teacher" ou "administrator".
     * Par défaut : "student".
     */
    private String role;
}
