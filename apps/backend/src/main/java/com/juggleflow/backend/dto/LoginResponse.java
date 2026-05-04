package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Réponse d'authentification.
 *
 * Le champ refreshToken est utilisé en interne (AuthController → CookieUtils)
 * pour poser le cookie httpOnly. Il n'est jamais sérialisé dans le body JSON
 * envoyé au client : AuthController appelle withoutRefreshToken() avant de
 * retourner la réponse, ce qui exclut le champ via @JsonIgnore.
 *
 * Architecture résultante :
 *   - body JSON  → accessToken uniquement (lu par le JS en mémoire)
 *   - cookie     → refreshToken httpOnly/Secure/SameSite=Strict (invisible au JS)
 */
@Data
@Builder
public class LoginResponse {

  /** Inclus dans le body JSON — stocké en mémoire JS côté client. */
  private String accessToken;

  /**
   * Jamais exposé dans le body JSON (voir withoutRefreshToken()).
   * Transmis uniquement via le cookie httpOnly posé par AuthController.
   */
  @com.fasterxml.jackson.annotation.JsonIgnore
  private String refreshToken;

  private String tokenType;
  private Long expiresIn;
  private Long userId;
  private String email;
  private String firstName;
  private String lastName;
  private String role;

  /**
   * Retourne this après avoir effacé le refresh token du champ.
   * Appelé par AuthController juste avant de sérialiser la réponse,
   * pour garantir qu'aucune fuite du refresh token n'est possible
   * même en cas de bug sur l'annotation @JsonIgnore.
   */
  public LoginResponse withoutRefreshToken() {
    this.refreshToken = null;
    return this;
  }
}
