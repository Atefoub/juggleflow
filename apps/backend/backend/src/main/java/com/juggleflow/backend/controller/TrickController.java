package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.TrickResponse;
import com.juggleflow.backend.service.TrickService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tricks")
@RequiredArgsConstructor
@Tag(name = "Figures", description = "Catalogue de figures de jonglage")
@SecurityRequirement(name = "bearerAuth")
public class TrickController {

    private final TrickService trickService;

    /**
     * GET /api/tricks
     * Paramètres optionnels : level, categoryId, search, page, size, sort
     */
    @GetMapping
    @Operation(summary = "Liste paginée des figures avec filtres optionnels")
    public ResponseEntity<Page<TrickResponse>> findAll(
            @RequestParam(required = false) String level,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "difficultyScore") String sort) {

        size = Math.min(size, 50); // plafond à 50 par page
        Pageable pageable = PageRequest.of(page, size, Sort.by(sort).ascending());
        return ResponseEntity.ok(trickService.findAll(level, categoryId, search, pageable));
    }

    /**
     * GET /api/tricks/{id}
     */
    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une figure")
    public ResponseEntity<TrickResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(trickService.findById(id));
    }

    /**
     * GET /api/tricks/recommended?level=beginner
     */
    @GetMapping("/recommended")
    @Operation(summary = "Figures recommandées pour un niveau")
    public ResponseEntity<List<TrickResponse>> findRecommended(
            @RequestParam(defaultValue = "beginner") String level) {
        return ResponseEntity.ok(trickService.findRecommended(level));
    }

    /**
     * GET /api/tricks/popular
     */
    @GetMapping("/popular")
    @Operation(summary = "Figures populaires")
    public ResponseEntity<List<TrickResponse>> findPopular() {
        return ResponseEntity.ok(trickService.findPopular());
    }
}
