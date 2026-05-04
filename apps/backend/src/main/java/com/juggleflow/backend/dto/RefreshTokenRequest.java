package com.juggleflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO pour le endpoint POST /api/auth/refresh.
 * Le refresh token est transmis dans le body (jamais en query param ou header
 * exposé dans les logs du proxy).
 */
@Data
public class RefreshTokenRequest {

  @NotBlank(message = "Le refresh token est obligatoire")
  private String refreshToken;
}
