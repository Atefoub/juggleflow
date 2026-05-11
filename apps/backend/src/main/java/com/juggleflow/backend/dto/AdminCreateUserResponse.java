package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Reponse de creation d'utilisateur par l'admin.
 *
 * Contient les memes champs que {@link AdminUserResponse} plus un eventuel
 * mot de passe genere ({@code generatedPassword}) que le serveur renvoie
 * UNE SEULE FOIS quand l'admin n'en a pas fourni. Cote frontend, on l'affiche
 * dans une modale "a copier maintenant" puis on l'efface.
 */
@Data
@Builder
public class AdminCreateUserResponse {

    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private boolean enabled;
    private Long classId;
    private String className;

    /**
     * Mot de passe en clair, present uniquement quand le serveur l'a genere.
     * Jamais persiste, jamais relu : c'est a l'admin de le transmettre.
     */
    private String generatedPassword;
}
