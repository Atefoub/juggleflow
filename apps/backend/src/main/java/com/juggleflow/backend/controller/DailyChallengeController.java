package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.DailyChallengeResponse;
import com.juggleflow.backend.service.DailyChallengeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint defi du jour : retourne le defi actif pour aujourd'hui
 * (rotation deterministe cote service) ou 204 si aucun defi configure.
 *
 * Reserve aux eleves : les profs/admins n'en ont pas besoin pour le
 * pilotage. Si plus tard on veut le rendre visible cote enseignant
 * (preview), on assouplira via une route additionnelle.
 */
@RestController
@RequestMapping("/api/eleve/daily-challenge")
@RequiredArgsConstructor
@Tag(name = "Defi du jour", description = "Defi quotidien pour l'eleve connecte")
@SecurityRequirement(name = "bearerAuth")
public class DailyChallengeController {

    private final DailyChallengeService dailyChallengeService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ELEVE')")
    @Operation(summary = "Defi du jour pour l'eleve connecte (rotation deterministe)")
    public ResponseEntity<DailyChallengeResponse> getDailyChallenge() {
        return dailyChallengeService.getTodayChallenge()
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
