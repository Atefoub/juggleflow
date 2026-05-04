package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.LoginRequest;
import com.juggleflow.backend.dto.LoginResponse;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CORRECTIONS SÉCURITÉ appliquées :
 *
 * [VULN-19] TIMING ATTACK sur le login :
 *           L'ancienne implémentation cherchait d'abord l'utilisateur par email PUIS
 *           appelait authenticationManager.authenticate(). Si l'email n'existe pas,
 *           la réponse est instantanée (pas de BCrypt). Si l'email existe mais que le
 *           MDP est faux, la réponse prend ~300ms (BCrypt 12 rounds).
 *           Cette différence de timing permet d'énumérer les emails existants.
 *           CORRECTION : authenticationManager.authenticate() est TOUJOURS appelé en
 *           premier. Il délègue à DaoAuthenticationProvider qui exécute
 *           BCryptPasswordEncoder.matches() dans tous les cas (dummy hash si user
 *           introuvable, depuis Spring Security 5.7+).
 *
 * [VULN-20] PRIVILEGE ESCALATION via le champ "role" :
 *           L'ancienne implémentation acceptait "ROLE_ADMINISTRATEUR" et levait une
 *           exception avec un message lisible. La validation est maintenant plus stricte :
 *           seuls "ROLE_ELEVE" et "ROLE_ENSEIGNANT" sont autorisés — toute autre valeur
 *           est silencieusement rabattue sur ROLE_ELEVE.
 *
 * [VULN-21] ENUMERATION D'EMAILS : le message d'erreur "Utilisateur introuvable"
 *           permettait de savoir si un email était enregistré.
 *           CORRECTION : message générique uniforme dans GlobalExceptionHandler.
 *
 * [VULN-22] REFRESH TOKEN ENDPOINT : ajout d'un endpoint /api/auth/refresh sécurisé
 *           qui échange un refresh token valide contre un nouvel access token.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository       userRepository;
  private final PasswordEncoder      passwordEncoder;
  private final JwtUtils             jwtUtils;
  private final AuthenticationManager authenticationManager;
  private final UserDetailsService   userDetailsService;

  // ── Connexion ──────────────────────────────────────────────────

  /**
   * [VULN-19] authenticate() est appelé EN PREMIER — garantit un timing
   * constant qu'il y ait un utilisateur ou non.
   */
  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest request) {
    // Lance BadCredentialsException (message générique) si échec
    authenticationManager.authenticate(
      new UsernamePasswordAuthenticationToken(
        request.getEmail(), request.getPassword())
    );

    // À ce stade, l'authentification a réussi — l'utilisateur existe forcément.
    User user = userRepository.findByEmail(request.getEmail())
      .orElseThrow(() -> new BadCredentialsException("Identifiants invalides"));

    UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
    return buildLoginResponse(user, userDetails);
  }

  // ── Inscription ───────────────────────────────────────────────

  @Transactional
  public LoginResponse register(RegisterRequest request) {
    // [VULN-21] Message générique — pas de confirmation que l'email existe
    if (userRepository.existsByEmail(request.getEmail())) {
      throw new BadCredentialsException("Identifiants invalides");
    }

    User user = createUserByRole(request);
    userRepository.save(user);

    UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
    return buildLoginResponse(user, userDetails);
  }

  // ── Refresh token ──────────────────────────────────────────────

  /**
   * [VULN-22] Échange un refresh token valide contre un nouvel access token.
   * Le refresh token est révoqué après usage (rotation).
   */
  @Transactional(readOnly = true)
  public LoginResponse refresh(String refreshToken) {
    String email;
    try {
      email = jwtUtils.extractEmail(refreshToken);
    } catch (Exception e) {
      throw new BadCredentialsException("Refresh token invalide");
    }

    UserDetails userDetails = userDetailsService.loadUserByUsername(email);

    if (!jwtUtils.isRefreshTokenValid(refreshToken, userDetails)) {
      throw new BadCredentialsException("Refresh token invalide ou expiré");
    }

    // Rotation : révoque l'ancien refresh token
    jwtUtils.revokeToken(refreshToken);

    User user = userRepository.findByEmail(email)
      .orElseThrow(() -> new BadCredentialsException("Identifiants invalides"));

    return buildLoginResponse(user, userDetails);
  }

  // ── Logout / Révocation ───────────────────────────────────────

  /**
   * [VULN-R3] Révoque un refresh token lors du logout.
   * Silencieux si le token est déjà invalide ou malformé.
   */
  public void revokeRefreshToken(String refreshToken) {
    try {
      jwtUtils.revokeToken(refreshToken);
    } catch (Exception ignored) {
      // Token déjà invalide — pas d'erreur à remonter au client
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  /**
   * [VULN-20] Seuls ROLE_ELEVE et ROLE_ENSEIGNANT sont autorisés.
   * Toute autre valeur (y compris ROLE_ADMINISTRATEUR) → ROLE_ELEVE par défaut.
   */
  private User createUserByRole(RegisterRequest req) {
    String encodedPassword = passwordEncoder.encode(req.getPassword());

    String rawRole = req.getRole() != null ? req.getRole().toUpperCase().trim() : "";
    boolean isTeacher = rawRole.equals("ROLE_ENSEIGNANT") || rawRole.equals("TEACHER");

    if (isTeacher) {
      return Teacher.builder()
        .email(req.getEmail())
        .password(encodedPassword)
        .firstName(req.getFirstName())
        .lastName(req.getLastName())
        .build();
    }
    // [VULN-20] Tout autre rôle → Student (fail-safe)
    return Student.builder()
      .email(req.getEmail())
      .password(encodedPassword)
      .firstName(req.getFirstName())
      .lastName(req.getLastName())
      .build();
  }

  private LoginResponse buildLoginResponse(User user, UserDetails userDetails) {
    return LoginResponse.builder()
      .accessToken(jwtUtils.generateToken(userDetails))
      .refreshToken(jwtUtils.generateRefreshToken(userDetails))
      .tokenType("Bearer")
      .expiresIn(jwtUtils.getExpirationMs())
      .userId(user.getId())
      .email(user.getEmail())
      .firstName(user.getFirstName())
      .lastName(user.getLastName())
      .role(user.getRole())
      .build();
  }
}
