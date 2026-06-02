package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.AssignPathRequest;
import com.juggleflow.backend.dto.AssignPathToStudentRequest;
import com.juggleflow.backend.dto.ClassStudentPathOverviewResponse;
import com.juggleflow.backend.dto.LearningPathResponse;
import com.juggleflow.backend.dto.StudentPathAssignmentResponse;
import com.juggleflow.backend.dto.StudentPathProgressResponse;
import com.juggleflow.backend.service.LearningPathService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/** Parcours pédagogiques : lecture sous /api/learning-paths, assignation sous /api/classes. */
@RestController
@RequiredArgsConstructor
@Tag(name = "Parcours pédagogiques",
     description = "Consultation des parcours et assignation aux classes")
@SecurityRequirement(name = "bearerAuth")
public class LearningPathController {

    private final LearningPathService learningPathService;


    @GetMapping("/api/learning-paths")
    @Operation(summary = "Lister les parcours pédagogiques disponibles")
    public ResponseEntity<List<LearningPathResponse>> getAllPaths(
            @RequestParam(required = false) String level) {

        return ResponseEntity.ok(learningPathService.getAllPaths(level));
    }

    /**
     * GET /api/eleve/learning-paths
     * Retourne les parcours assignés à la classe de l'élève connecté.
     *
     * (Le catalogue global est accessible via /api/learning-paths)
     */
    @GetMapping("/api/eleve/learning-paths")
    @PreAuthorize("hasAuthority('ROLE_ELEVE')")
    @Operation(summary = "Lister mes parcours assignés (élève)")
    public ResponseEntity<List<LearningPathResponse>> getMyAssignedPaths(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                learningPathService.getMyAssignedPaths(userDetails.getUsername()));
    }

    @GetMapping("/api/learning-paths/{id}")
    @Operation(summary = "Détail d'un parcours pédagogique")
    public ResponseEntity<LearningPathResponse> getPathById(@PathVariable Long id) {
        return ResponseEntity.ok(learningPathService.getPathById(id));
    }


    /**
     * GET /api/enseignant/classes/{classId}/paths
     * Liste les parcours déjà assignés à une classe.
     */
    @GetMapping("/api/enseignant/classes/{classId}/paths")
    @Operation(summary = "Lister les parcours assignés à une classe")
    public ResponseEntity<List<LearningPathResponse>> getAssignedPathsForClass(
            @PathVariable Long classId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                learningPathService.getAssignedPathsForClass(classId, userDetails.getUsername()));
    }

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
    @GetMapping("/api/enseignant/classes/{classId}/paths/overview")
    @Operation(summary = "Vue parcours effectif par élève de la classe")
    public ResponseEntity<List<ClassStudentPathOverviewResponse>> getClassPathOverview(
            @PathVariable Long classId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                learningPathService.getClassPathOverview(classId, userDetails.getUsername()));
    }

    @GetMapping("/api/enseignant/classes/{classId}/students/{studentId}/paths")
    @Operation(summary = "Lister les parcours assignés à un élève")
    public ResponseEntity<List<LearningPathResponse>> getAssignedPathsForStudent(
            @PathVariable Long classId,
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                learningPathService.getAssignedPathsForStudent(
                        classId, studentId, userDetails.getUsername()));
    }

    @GetMapping("/api/enseignant/classes/{classId}/students/{studentId}/paths/effective")
    @Operation(summary = "Parcours effectif principal d'un élève")
    public ResponseEntity<StudentPathAssignmentResponse> getEffectiveAssignmentForStudent(
            @PathVariable Long classId,
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        StudentPathAssignmentResponse assignment =
                learningPathService.getEffectiveAssignmentForStudent(
                        classId, studentId, userDetails.getUsername());
        if (assignment == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(assignment);
    }

    @PostMapping("/api/enseignant/classes/{classId}/students/{studentId}/paths")
    @Operation(summary = "Assigner un parcours à un élève")
    public ResponseEntity<LearningPathResponse> assignPathToStudent(
            @PathVariable Long classId,
            @PathVariable Long studentId,
            @Valid @RequestBody AssignPathToStudentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        request.setStudentId(studentId);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(learningPathService.assignToStudent(
                        classId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/api/enseignant/classes/{classId}/students/{studentId}/paths/{pathId}")
    @Operation(summary = "Désassigner un parcours d'un élève")
    public ResponseEntity<Void> unassignPathFromStudent(
            @PathVariable Long classId,
            @PathVariable Long studentId,
            @PathVariable Long pathId,
            @AuthenticationPrincipal UserDetails userDetails) {

        learningPathService.unassignFromStudent(
                classId, studentId, pathId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

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

    /**
     * GET /api/enseignant/classes/{classId}/paths/{pathId}/progress/export
     * Export CSV de la progression des élèves sur un parcours.
     */
    @GetMapping(value = "/api/enseignant/classes/{classId}/paths/{pathId}/progress/export",
            produces = "text/csv")
    @Operation(summary = "Exporter la progression d'un parcours (CSV)")
    public ResponseEntity<String> exportStudentProgressCsv(
            @PathVariable Long classId,
            @PathVariable Long pathId,
            @AuthenticationPrincipal UserDetails userDetails) {

        List<StudentPathProgressResponse> rows =
                learningPathService.getStudentProgress(classId, pathId, userDetails.getUsername());

        String csv = toCsv(rows);

        String filename = "progress_class_" + classId + "_path_" + pathId + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(csv);
    }

    /**
     * GET /api/enseignant/classes/{classId}/paths/{pathId}/students/{studentId}
     * Progression d'un élève sur un parcours donné.
     */
    @GetMapping("/api/enseignant/classes/{classId}/paths/{pathId}/students/{studentId}")
    @Operation(summary = "Progression d'un élève sur un parcours donné")
    public ResponseEntity<StudentPathProgressResponse> getStudentProgressForStudent(
            @PathVariable Long classId,
            @PathVariable Long pathId,
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
                learningPathService.getStudentProgressForStudent(
                        classId, pathId, studentId, userDetails.getUsername()));
    }


    private String csvEscape(String value) {
        if (value == null) return "";
        String v = value.replace("\"", "\"\"");
        return "\"" + v + "\"";
    }

    private String toCsv(List<StudentPathProgressResponse> rows) {
        String header = String.join(",",
                "studentId",
                "firstName",
                "lastName",
                "completionPercent",
                "masteredCount",
                "totalSteps"
        );

        String body = rows.stream()
                .map(r -> String.join(",",
                        String.valueOf(r.getStudentId()),
                        csvEscape(r.getFirstName()),
                        csvEscape(r.getLastName()),
                        String.valueOf(r.getCompletionPercent()),
                        String.valueOf(r.getMasteredCount()),
                        String.valueOf(r.getTotalSteps())
                ))
                .collect(Collectors.joining("\n"));

        return header + "\n" + body + "\n";
    }
}
