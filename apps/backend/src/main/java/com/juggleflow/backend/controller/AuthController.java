package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.ForgotPasswordRequest;
import com.juggleflow.backend.dto.ForgotPasswordResponse;
import com.juggleflow.backend.dto.LoginRequest;
import com.juggleflow.backend.dto.LoginResponse;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.UserProfileResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.security.CookieUtils;
import com.juggleflow.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints d'authentification.
 *
 * Architecture des tokens (04/05/2026) :
 *   - Access token  → body JSON (stocké en mémoire JS, durée ~15 min)
 *   - Refresh token → cookie httpOnly/Secure/SameSite=Strict géré par CookieUtils
 *
 * Corrections appliquées dans cette version :
 *   [VULN-R3] Endpoint /logout ajouté (révocation serveur + suppression cookie).
 *   [FIX-COOKIE] Le refresh token transite désormais exclusivement par cookie
 *                httpOnly, cohérent avec ce qu'attend le frontend. L'ancien DTO
 *                RefreshTokenRequest dans le body est remplacé par la lecture
 *                du cookie via CookieUtils.extractRefreshToken().
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService    authService;
  private final UserRepository    userRepository;
  private final StudentRepository studentRepository;
  private final CookieUtils       cookieUtils;

  /**
   * POST /api/auth/login
   *
   * Retourne l'access token dans le body et pose le refresh token
   * dans un cookie httpOnly via CookieUtils.
   */
  @PostMapping("/login")
  public ResponseEntity<LoginResponse> login(
    @Valid @RequestBody LoginRequest request,
    HttpServletResponse response) {

    LoginResponse loginResponse = authService.login(request);
    cookieUtils.addRefreshTokenCookie(response, loginResponse.getRefreshToken());
    return ResponseEntity.ok(loginResponse.withoutRefreshToken());
  }

  /**
   * POST /api/auth/register
   *
   * Identique à /login : refresh token en cookie, access token en body.
   */
  @PostMapping("/register")
  public ResponseEntity<LoginResponse> register(
    @Valid @RequestBody RegisterRequest request,
    HttpServletResponse response) {

    LoginResponse loginResponse = authService.register(request);
    cookieUtils.addRefreshTokenCookie(response, loginResponse.getRefreshToken());
    return ResponseEntity.ok(loginResponse.withoutRefreshToken());
  }

  /**
   * POST /api/auth/forgot-password
   * Demande de réinitialisation (traitement manuel par l'administrateur).
   */
  @PostMapping("/forgot-password")
  public ResponseEntity<ForgotPasswordResponse> forgotPassword(
    @Valid @RequestBody ForgotPasswordRequest request) {
    return ResponseEntity.accepted()
      .body(authService.requestPasswordReset(request.getEmail()));
  }

  /**
   * POST /api/auth/refresh
   *
   * [FIX-COOKIE] Le refresh token est lu depuis le cookie httpOnly
   * (envoyé automatiquement par le navigateur via withCredentials=true).
   * Aucun body n'est requis — cohérent avec ce qu'envoie le frontend.
   *
   * En cas de succès : rotation du refresh token (nouveau cookie posé,
   * ancien révoqué) et nouvel access token retourné dans le body.
   */
  @PostMapping("/refresh")
  public ResponseEntity<LoginResponse> refresh(
    HttpServletRequest request,
    HttpServletResponse response) {

    String refreshToken = cookieUtils.extractRefreshToken(request)
      .orElseThrow(() -> new BadCredentialsException("Cookie refresh_token absent ou expiré"));

    LoginResponse loginResponse = authService.refresh(refreshToken);
    cookieUtils.addRefreshTokenCookie(response, loginResponse.getRefreshToken());
    return ResponseEntity.ok(loginResponse.withoutRefreshToken());
  }

  /**
   * POST /api/auth/logout
   *
   * [VULN-R3] Révoque le refresh token côté serveur et supprime le cookie.
   * Accessible sans Bearer token valide : un utilisateur dont l'access token
   * a expiré doit pouvoir se déconnecter proprement.
   */
  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
    HttpServletRequest request,
    HttpServletResponse response) {

    cookieUtils.extractRefreshToken(request)
      .ifPresent(authService::revokeRefreshToken);

    cookieUtils.clearRefreshTokenCookie(response);
    return ResponseEntity.noContent().build();
  }

  /** GET /api/auth/me */
  @GetMapping("/me")
  public ResponseEntity<UserProfileResponse> me(
    @AuthenticationPrincipal UserDetails userDetails) {

    String email = userDetails.getUsername();
    User user = userRepository.findByEmail(email)
      .orElseThrow(() -> new ResourceNotFoundException(
        "Utilisateur introuvable : " + email));

    if ("ROLE_ELEVE".equals(user.getRole())) {
      return studentRepository.findByEmail(email)
        .map(UserProfileResponse::from)
        .map(ResponseEntity::ok)
        .orElseThrow(() -> new ResourceNotFoundException(
          "Élève introuvable : " + email));
    }

    return ResponseEntity.ok(UserProfileResponse.from(user));
  }
}
