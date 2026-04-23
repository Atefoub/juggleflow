// filename: backend/src/main/java/com/juggleflow/backend/controller/AuthController.java
// MODIFICATION par rapport à la version existante :
// Le endpoint GET /api/auth/me retourne maintenant un UserProfileResponse complet
// (id, email, firstName, lastName, role, createdAt) au lieu d'une simple String.
// Nécessaire pour que les tests getStudentId() et getUserId() fonctionnent.

package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.LoginRequest;
import com.juggleflow.backend.dto.LoginResponse;
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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    /**
     * POST /api/auth/login
     * Body : { "email": "...", "password": "..." }
     * Retourne : { "accessToken": "...", "role": "ROLE_ELEVE", ... }
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * POST /api/auth/register
     * Body : { "email": "...", "password": "...", "firstName": "...", "lastName": "...", "role": "..." }
     * Retourne : { "accessToken": "...", "role": "ROLE_ELEVE", ... }
     */
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * GET /api/auth/me
     * Header : Authorization: Bearer token
     * Retourne le profil complet de l'utilisateur connecté (id, email, rôle, dates).
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
