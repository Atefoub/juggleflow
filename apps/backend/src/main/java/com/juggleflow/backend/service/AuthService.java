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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtUtils jwtUtils;
  private final AuthenticationManager authenticationManager;
  private final UserDetailsService userDetailsService;

  // ── Connexion ────────────────────────────────────────────────

  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest request) {
    authenticationManager.authenticate(
      new UsernamePasswordAuthenticationToken(
        request.getEmail(), request.getPassword())
    );

    User user = userRepository.findByEmail(request.getEmail())
      .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

    UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());

    return buildLoginResponse(user, userDetails);
  }

  // ── Inscription ──────────────────────────────────────────────

  @Transactional
  public LoginResponse register(RegisterRequest request) {
    if (userRepository.existsByEmail(request.getEmail())) {
      throw new IllegalArgumentException("Cet email est déjà utilisé");
    }

    User user = createUserByRole(request);
    userRepository.save(user);

    UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
    return buildLoginResponse(user, userDetails);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private User createUserByRole(RegisterRequest req) {
    String encodedPassword = passwordEncoder.encode(req.getPassword());
    String role = req.getRole() != null ? req.getRole().toUpperCase() : "ROLE_ELEVE";

    // SÉCURITÉ : la création d'un compte ROLE_ADMINISTRATEUR est réservée
    // aux admins existants via un endpoint dédié et protégé (/api/admin/users).
    // Un appel public au register avec le rôle administrator est rejeté.
    if (role.equals("ROLE_ADMINISTRATEUR") || role.equals("ADMINISTRATOR")) {
      throw new IllegalArgumentException(
          "La création d'un compte administrateur n'est pas autorisée via cet endpoint.");
    }

    return switch (role) {
      case "ROLE_ENSEIGNANT", "TEACHER" -> Teacher.builder()
        .email(req.getEmail())
        .password(encodedPassword)
        .firstName(req.getFirstName())
        .lastName(req.getLastName())
        .build();
      default -> Student.builder()
        .email(req.getEmail())
        .password(encodedPassword)
        .firstName(req.getFirstName())
        .lastName(req.getLastName())
        .build();
    };
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
