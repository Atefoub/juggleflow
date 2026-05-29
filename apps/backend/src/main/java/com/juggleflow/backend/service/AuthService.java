package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.ForgotPasswordResponse;
import com.juggleflow.backend.dto.LoginRequest;
import com.juggleflow.backend.dto.LoginResponse;
import com.juggleflow.backend.config.AuthRegistrationProperties;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Authentification : login timing-safe, inscription limitée aux rôles élève/enseignant, refresh avec rotation. */
@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository       userRepository;
  private final PasswordEncoder      passwordEncoder;
  private final JwtUtils             jwtUtils;
  private final AuthenticationManager authenticationManager;
  private final UserDetailsService           userDetailsService;
  private final EstablishmentLicenseService establishmentLicenseService;
  private final AdminAuditService adminAuditService;
  private final AuthRegistrationProperties authRegistrationProperties;

  private static final String FORGOT_PASSWORD_GENERIC_MESSAGE =
    "Si un compte est associé à cette adresse, votre établissement a été informé. "
      + "Contactez votre administrateur ou enseignant référent pour obtenir un nouveau mot de passe.";

  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest request) {
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


  @Transactional
  public LoginResponse register(RegisterRequest request) {
    if (!authRegistrationProperties.isEnabled()) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Inscription publique désactivée. Contactez votre établissement.");
    }

    String rawRole = request.getRole() != null ? request.getRole().toUpperCase().trim() : "";
    boolean isTeacher = rawRole.equals("ROLE_ENSEIGNANT") || rawRole.equals("TEACHER");
    if (isTeacher && !authRegistrationProperties.isAllowTeacherRole()) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Inscription enseignant non autorisée. Contactez votre administrateur.");
    }

    if (userRepository.existsByEmail(request.getEmail())) {
      throw new BadCredentialsException("Identifiants invalides");
    }

    User user = createUserByRole(request);
    if (user instanceof Student || user instanceof Teacher) {
      establishmentLicenseService.assertSeatAvailableForNewAccount();
    }
    userRepository.save(user);

    UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
    return buildLoginResponse(user, userDetails);
  }


  /** Échange un refresh token valide contre un nouvel access token (rotation). */
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


  /**
   * Demande de réinitialisation de mot de passe (établissement scolaire).
   * Réponse toujours identique ; si le compte existe et est actif, une entrée
   * d'audit est créée pour l'administrateur (sans révéler l'existence du compte).
   */
  @Transactional
  public ForgotPasswordResponse requestPasswordReset(String email) {
    String normalized = email != null ? email.trim().toLowerCase() : "";

    userRepository.findByEmail(normalized).ifPresent(user -> {
      if (user.isEnabled()) {
        adminAuditService.record(
          "password-reset@juggleflow",
          "PASSWORD_RESET_REQUESTED",
          "userId=" + user.getId());
      }
    });

    return ForgotPasswordResponse.builder()
      .message(FORGOT_PASSWORD_GENERIC_MESSAGE)
      .build();
  }

  /** Révoque un refresh token lors du logout (silencieux si déjà invalide). */
  public void revokeRefreshToken(String refreshToken) {
    try {
      jwtUtils.revokeToken(refreshToken);
    } catch (Exception ignored) {
      // Token déjà invalide — pas d'erreur à remonter au client
    }
  }


  /** Inscription : seuls élève et enseignant ; tout autre rôle → élève. */
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
