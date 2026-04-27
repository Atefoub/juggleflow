package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.ProgressRequest;
import com.juggleflow.backend.dto.ProgressResponse;
import com.juggleflow.backend.dto.StatisticsResponse;
import com.juggleflow.backend.service.ProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
@Tag(name = "Progression", description = "Suivi de la progression par figure")
@SecurityRequirement(name = "bearerAuth")
public class ProgressController {

  private final ProgressService progressService;

  /**
   * GET /api/progress
   * Retourne toute la progression de l'utilisateur connecté.
   */
  @GetMapping
  @Operation(summary = "Progression complète de l'utilisateur connecté")
  public ResponseEntity<List<ProgressResponse>> getMyProgress(
    @AuthenticationPrincipal UserDetails userDetails) {
    return ResponseEntity.ok(progressService.getProgress(userDetails.getUsername()));
  }

  /**
   * PUT /api/progress/{trickId}
   * Crée ou met à jour la progression sur une figure donnée.
   */
  @PutMapping("/{trickId}")
  @Operation(summary = "Mettre à jour la progression sur une figure")
  public ResponseEntity<ProgressResponse> updateProgress(
    @PathVariable Long trickId,
    @Valid @RequestBody ProgressRequest request,
    @AuthenticationPrincipal UserDetails userDetails) {
    return ResponseEntity.ok(
      progressService.upsertProgress(userDetails.getUsername(), trickId, request));
  }

  /**
   * GET /api/progress/statistics
   * Statistiques agrégées : figures maîtrisées, en cours, badges obtenus.
   */
  @GetMapping("/statistics")
  @Operation(summary = "Statistiques agrégées de l'utilisateur connecté")
  public ResponseEntity<StatisticsResponse> getStatistics(
    @AuthenticationPrincipal UserDetails userDetails) {
    return ResponseEntity.ok(progressService.getStatistics(userDetails.getUsername()));
  }
}
