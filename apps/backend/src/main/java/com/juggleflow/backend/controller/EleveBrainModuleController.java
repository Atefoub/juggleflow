package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.BrainModuleProgressResponse;
import com.juggleflow.backend.service.BrainModuleProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/eleve/brain-module")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ELEVE')")
@Tag(name = "Module neurosciences", description = "Progression du module « Mon cerveau »")
@SecurityRequirement(name = "bearerAuth")
public class EleveBrainModuleController {

    private final BrainModuleProgressService brainModuleProgressService;

    @GetMapping
    @Operation(summary = "Progression du module neurosciences")
    public ResponseEntity<BrainModuleProgressResponse> getProgress(
        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(brainModuleProgressService.getProgress(principal.getUsername()));
    }

    @PostMapping("/chapters/{chapterNumber}/complete")
    @Operation(summary = "Marquer un chapitre comme terminé")
    public ResponseEntity<BrainModuleProgressResponse> completeChapter(
        @PathVariable int chapterNumber,
        @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(
            brainModuleProgressService.completeChapter(principal.getUsername(), chapterNumber));
    }
}
