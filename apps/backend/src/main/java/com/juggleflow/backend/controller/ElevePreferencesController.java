package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.StudentPreferencesResponse;
import com.juggleflow.backend.dto.UpdateStudentPreferencesRequest;
import com.juggleflow.backend.service.StudentPreferencesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/eleve/preferences")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ELEVE')")
@Tag(name = "Préférences élève", description = "Préférences de profil (rappels, etc.)")
@SecurityRequirement(name = "bearerAuth")
public class ElevePreferencesController {

    private final StudentPreferencesService studentPreferencesService;

    @GetMapping
    @Operation(summary = "Lire les préférences de l'élève connecté")
    public ResponseEntity<StudentPreferencesResponse> getPreferences(
        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(studentPreferencesService.getPreferences(principal.getUsername()));
    }

    @PatchMapping
    @Operation(summary = "Mettre à jour les préférences")
    public ResponseEntity<StudentPreferencesResponse> updatePreferences(
        @Valid @RequestBody UpdateStudentPreferencesRequest request,
        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(
            studentPreferencesService.updatePreferences(principal.getUsername(), request));
    }
}
