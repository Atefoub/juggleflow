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

@RestController
@RequiredArgsConstructor
@Tag(name = "Parcours pédagogiques",
     description = "Consultation des parcours et assignation aux classes")
@SecurityRequirement(name = "bearerAuth")
public class LearningPathController {

    private final LearningPathService learningPathService;

    /**
     * GET /api/tricks/paths?level=BEGINNER
     * Retourne tous les parcours actifs, avec filtre optionnel par niveau.
     * Accessible à tout utilisateur authentifié.
     */
    @GetMapping("/api/tricks/paths")
    @Operation(summary = "Lister les parcours pédagogiques disponibles")
    public ResponseEntity<List<LearningPathResponse>> getAllPaths(
            @RequestParam(required = false) String level) {

        return ResponseEntity.ok(learningPathService.getAllPaths(level));
    }

    /**
     * GET /api/tricks/paths/{id}
     * Détail complet d'un parcours avec ses étapes et figures.
     * Accessible à tout utilisateur authentifié.
     */
    @GetMapping("/api/tricks/paths/{id}")
    @Operation(summary = "Détail d'un parcours pédagogique")
    public ResponseEntity<LearningPathResponse> getPathById(@PathVariable Long id) {
        return ResponseEntity.ok(learningPathService.getPathById(id));
    }

    /**
     * POST /api/enseignant/classes/{classId}/paths
     * Assigne un parcours à une classe.
     * Réservé à ROLE_ENSEIGNANT et ROLE_ADMIN.
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
     * Réservé à ROLE_ENSEIGNANT et ROLE_ADMIN.
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
     * Réservé à ROLE_ENSEIGNANT et ROLE_ADMIN.
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
