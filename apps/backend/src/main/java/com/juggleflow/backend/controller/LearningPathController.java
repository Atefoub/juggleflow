// filename: backend/src/main/java/com/juggleflow/backend/controller/LearningPathController.java
package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.AssignPathRequest;
import com.juggleflow.backend.dto.LearningPathResponse;
import com.juggleflow.backend.dto.StudentPathProgressResponse;
import com.juggleflow.backend.service.LearningPathService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Contrôleur des parcours pédagogiques.
 *
 * CORRECTIONS APPLIQUÉES :
 *
 * [FIX-ROUTE-COLLISION] Les routes /api/tricks/paths et /api/tricks/paths/{id}
 *   étaient déclarées avec des @GetMapping en dur dans un contrôleur sans
 *   @RequestMapping. Cela créait un risque de collision avec TrickController
 *   (qui a @RequestMapping("/api/tricks")) : Spring pouvait matcher "paths"
 *   comme valeur du PathVariable {id} de GET /api/tricks/{id}.
 *
 *   CORRECTION : Les routes de lecture des parcours sont déplacées sous
 *   /api/learning-paths (préfixe dédié) pour éviter toute ambiguïté.
 *   Le Swagger reste cohérent via les @Operation annotations.
 *
 * [FIX-STRUCTURE] Deux groupes de routes distincts → deux méthodes de mapping
 *   claires avec préfixes séparés, sans @RequestMapping commun artificiel
 *   (les préfixes sont trop différents pour être factorisés).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Parcours pédagogiques",
     description = "Consultation des parcours et assignation aux classes")
@SecurityRequirement(name = "bearerAuth")
public class LearningPathController {

    private final LearningPathService learningPathService;

    // ── Endpoints lecture des parcours (/api/learning-paths) ────────────────

    /**
     * GET /api/learning-paths?level=BEGINNER
     * Retourne tous les parcours actifs, avec filtre optionnel par niveau.
     * Accessible à tout utilisateur authentifié.
     *
     * [FIX-ROUTE-COLLISION] Ancienne route : /api/tricks/paths
     * Nouvelle route : /api/learning-paths (évite la collision avec TrickController)
     */
    @GetMapping("/api/learning-paths")
    @Operation(summary = "Lister les parcours pédagogiques disponibles")
    public ResponseEntity<List<LearningPathResponse>> getAllPaths(
            @RequestParam(required = false) String level) {

        return ResponseEntity.ok(learningPathService.getAllPaths(level));
    }

    /**
     * GET /api/learning-paths/{id}
     * Détail complet d'un parcours avec ses étapes et figures.
     * Accessible à tout utilisateur authentifié.
     *
     * [FIX-ROUTE-COLLISION] Ancienne route : /api/tricks/paths/{id}
     * Nouvelle route : /api/learning-paths/{id}
     */
    @GetMapping("/api/learning-paths/{id}")
    @Operation(summary = "Détail d'un parcours pédagogique")
    public ResponseEntity<LearningPathResponse> getPathById(@PathVariable Long id) {
        return ResponseEntity.ok(learningPathService.getPathById(id));
    }

    // ── Endpoints enseignant (/api/enseignant/classes/{classId}/paths) ───────

    /**
     * POST /api/enseignant/classes/{classId}/paths
     * Assigne un parcours à une classe.
     * Réservé à ROLE_ENSEIGNANT et ROLE_ADMINISTRATEUR.
     */
    @PostMapping("/api/enseignant/classes/{classId}/paths")
    @Operation(summary = "Assigner un parcours à une classe")
    public ResponseEntity<LearningPathResponse> assignPath(
            @PathVariable Long classId,
            @Valid @RequestBody AssignPathRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Cohérence : le classId de l'URL prime sur celui du body
        request.setClassId(classId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(learningPathService.assignToClass(request, userDetails.getUsername()));
    }

    /**
     * DELETE /api/enseignant/classes/{classId}/paths/{pathId}
     * Désassigne un parcours d'une classe.
     * Réservé à ROLE_ENSEIGNANT et ROLE_ADMINISTRATEUR.
     */
    @DeleteMapping("/api/enseignant/classes/{classId}/paths/{pathId}")
    @Operation(summary = "Désassigner un parcours d'une classe")
    public ResponseEntity<Void> unassignPath(
            @PathVariable Long classId,
            @PathVariable Long pathId,
            @AuthenticationPrincipal UserDetails userDetails) {

        learningPathService.unassignFromClass(classId, pathId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/enseignant/classes/{classId}/paths/{pathId}/progress
     * Progression de chaque élève de la classe sur ce parcours.
     * Réservé à ROLE_ENSEIGNANT et ROLE_ADMINISTRATEUR.
     */
    @GetMapping("/api/enseignant/classes/{classId}/paths/{pathId}/progress")
    @Operation(summary = "Progression des élèves sur un parcours donné")
    public ResponseEntity<List<StudentPathProgressResponse>> getStudentProgress(
            @PathVariable Long classId,
            @PathVariable Long pathId,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
                learningPathService.getStudentProgress(
                    classId, pathId, userDetails.getUsername()));
    }
}
