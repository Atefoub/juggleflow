package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.LoginRequest;
import com.juggleflow.backend.dto.LoginResponse;
import com.juggleflow.backend.dto.RefreshTokenRequest;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.UserProfileResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-22] AJOUT de POST /api/auth/refresh pour échanger un refresh token
 *           contre un nouvel access token (rotation de tokens).
 *
 * [VULN-23] /api/auth/me : le UserRepository est injecté via le service,
 *           mais l'accès direct depuis le contrôleur est acceptable ici.
 *           Le DTO UserProfileResponse ne retourne PAS le hash du mot de passe.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService    authService;
  private final UserRepository userRepository;

  /**
   * POST /api/auth/login
   */
  @PostMapping("/login")
  public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
    return ResponseEntity.ok(authService.login(request));
  }

  /**
   * POST /api/auth/register
   */
  @PostMapping("/register")
  public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
    return ResponseEntity.ok(authService.register(request));
  }

  /**
   * POST /api/auth/refresh
   * [VULN-22] Rotation du refresh token.
   * Le refresh token est passé dans le body (jamais dans un query param).
   */
  @PostMapping("/refresh")
  public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
    return ResponseEntity.ok(authService.refresh(request.getRefreshToken()));
  }

  /**
   * GET /api/auth/me
   * [VULN-23] Retourne le profil sans le hash du mot de passe.
   */
  @GetMapping("/me")
  public ResponseEntity<UserProfileResponse> me(
    @AuthenticationPrincipal UserDetails userDetails) {

    User user = userRepository.findByEmail(userDetails.getUsername())
      .orElseThrow(() -> new ResourceNotFoundException(
        "Utilisateur introuvable : " + userDetails.getUsername()));

    return ResponseEntity.ok(UserProfileResponse.from(user));
  }
}
