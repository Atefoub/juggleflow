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
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
 * CORRECTION RÉSIDUELLE [VULN-R3] :
 *
 * Le frontend (authApi.ts) appelle POST /api/auth/logout pour révoquer le
 * refresh token côté serveur et supprimer le cookie httpOnly.
 * Cet endpoint était ABSENT — le cookie httpOnly n'était donc jamais
 * supprimé côté serveur, rendant le "logout" purement local (suppression
 * de l'access token en mémoire uniquement).
 *
 * Impact : si un attaquant a pu lire le cookie (via un accès physique à la
 * machine ou une vulnérabilité réseau), il peut continuer à obtenir des
 * access tokens via /api/auth/refresh même après un "logout".
 *
 * CORRECTION : endpoint POST /api/auth/logout qui :
 *   1. Révoque le refresh token en blacklist (via JwtUtils.revokeToken)
 *   2. Supprime le cookie httpOnly côté serveur (Set-Cookie avec expires=passé)
 *
 * Note : l'endpoint /refresh attend le refresh token dans le body (architecture
 * actuelle). Pour la variante cookie, le refresh token serait lu depuis le
 * cookie — les deux approches sont décrites dans les commentaires.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService    authService;
  private final UserRepository userRepository;

  /** POST /api/auth/login */
  @PostMapping("/login")
  public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
    return ResponseEntity.ok(authService.login(request));
  }

  /** POST /api/auth/register */
  @PostMapping("/register")
  public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
    return ResponseEntity.ok(authService.register(request));
  }

  /** POST /api/auth/refresh */
  @PostMapping("/refresh")
  public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
    return ResponseEntity.ok(authService.refresh(request.getRefreshToken()));
  }

  /**
   * POST /api/auth/logout
   *
   * [VULN-R3] Endpoint manquant dans la version précédente.
   *
   * Accepte le refresh token dans le body pour le révoquer, et efface
   * le cookie httpOnly "refresh_token" si l'architecture évolue vers
   * une gestion du refresh token entièrement côté cookie.
   *
   * Accessible sans token Bearer (l'utilisateur peut être déjà déconnecté
   * localement et vouloir révoquer son refresh token côté serveur).
   */
  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
    @RequestBody(required = false) RefreshTokenRequest request,
    HttpServletRequest httpRequest,
    HttpServletResponse httpResponse) {

    // Révoque le refresh token s'il est fourni dans le body
    if (request != null && request.getRefreshToken() != null) {
      authService.revokeRefreshToken(request.getRefreshToken());
    }

    // [VULN-R3] Supprime le cookie httpOnly "refresh_token" côté navigateur
    // en le réécrivant avec une date d'expiration dans le passé.
    Cookie expiredCookie = new Cookie("refresh_token", "");
    expiredCookie.setHttpOnly(true);
    expiredCookie.setSecure(true);          // HTTPS uniquement
    expiredCookie.setPath("/api/auth");     // même path que la création
    expiredCookie.setMaxAge(0);             // expire immédiatement
    expiredCookie.setAttribute("SameSite", "Strict");
    httpResponse.addCookie(expiredCookie);

    return ResponseEntity.noContent().build();
  }

  /** GET /api/auth/me */
  @GetMapping("/me")
  public ResponseEntity<UserProfileResponse> me(
    @AuthenticationPrincipal UserDetails userDetails) {

    User user = userRepository.findByEmail(userDetails.getUsername())
      .orElseThrow(() -> new ResourceNotFoundException(
        "Utilisateur introuvable : " + userDetails.getUsername()));

    return ResponseEntity.ok(UserProfileResponse.from(user));
  }
}
