package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.BadgeResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.service.BadgeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/badges")
@RequiredArgsConstructor
@Tag(name = "Badges", description = "Système de gamification — badges et accomplissements")
@SecurityRequirement(name = "bearerAuth")
public class BadgeController {

  private final BadgeService   badgeService;
  private final UserRepository userRepository;

  /**
   * GET /api/badges
   * Tous les badges disponibles dans l'application.
   */
  @GetMapping
  @Operation(summary = "Catalogue complet des badges disponibles")
  public ResponseEntity<List<BadgeResponse>> getAllBadges() {
    return ResponseEntity.ok(badgeService.getAllBadges());
  }

  /**
   * GET /api/badges/unlocked
   * Badges débloqués par l'utilisateur connecté.
   */
  @GetMapping("/unlocked")
  @Operation(summary = "Badges débloqués par l'utilisateur connecté")
  public ResponseEntity<List<BadgeResponse>> getUnlockedBadges(
    @AuthenticationPrincipal UserDetails userDetails) {

    Long userId = userRepository.findByEmail(userDetails.getUsername())
      .orElseThrow(() -> new ResourceNotFoundException(
        "Utilisateur authentifié introuvable en base"))
      .getId();

    return ResponseEntity.ok(badgeService.getUnlockedBadges(userId));
  }
}
