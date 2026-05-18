package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.TrickResponse;
import com.juggleflow.backend.service.TrickFavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/eleve/favorites")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ELEVE')")
@Tag(name = "Favoris élève", description = "Figures favorites du catalogue")
@SecurityRequirement(name = "bearerAuth")
public class EleveFavoriteController {

    private final TrickFavoriteService trickFavoriteService;

    @GetMapping
    @Operation(summary = "Liste des figures favorites (détail)")
    public ResponseEntity<List<TrickResponse>> listFavorites(
        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(trickFavoriteService.listFavorites(principal.getUsername()));
    }

    @GetMapping("/ids")
    @Operation(summary = "Identifiants des figures favorites")
    public ResponseEntity<List<Long>> listFavoriteIds(
        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(trickFavoriteService.listFavoriteTrickIds(principal.getUsername()));
    }

    @PutMapping("/{trickId}")
    @Operation(summary = "Ajouter une figure aux favoris")
    public ResponseEntity<Void> addFavorite(
        @PathVariable Long trickId,
        @AuthenticationPrincipal UserDetails principal) {
        trickFavoriteService.addFavorite(principal.getUsername(), trickId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @DeleteMapping("/{trickId}")
    @Operation(summary = "Retirer une figure des favoris")
    public ResponseEntity<Void> removeFavorite(
        @PathVariable Long trickId,
        @AuthenticationPrincipal UserDetails principal) {
        trickFavoriteService.removeFavorite(principal.getUsername(), trickId);
        return ResponseEntity.noContent().build();
    }
}
