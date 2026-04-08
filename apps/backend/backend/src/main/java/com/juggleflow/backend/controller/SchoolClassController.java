// filename: backend/src/main/java/com/juggleflow/backend/controller/SchoolClassController.java
package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.dto.StudentSummaryResponse;
import com.juggleflow.backend.service.SchoolClassService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/enseignant/classes")
@RequiredArgsConstructor
@Tag(name = "Classes", description = "Gestion des classes scolaires par les enseignants")
@SecurityRequirement(name = "bearerAuth")
public class SchoolClassController {

    private final SchoolClassService schoolClassService;

    /**
     * POST /api/enseignant/classes
     * Crée une nouvelle classe rattachée à l'enseignant connecté.
     */
    @PostMapping
    @Operation(summary = "Créer une nouvelle classe")
    public ResponseEntity<SchoolClassResponse> createClass(
            @Valid @RequestBody SchoolClassRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(schoolClassService.createClass(request, userDetails.getUsername()));
    }

    /**
     * GET /api/enseignant/classes
     * Retourne toutes les classes dont l'enseignant connecté est titulaire.
     */
    @GetMapping
    @Operation(summary = "Lister mes classes")
    public ResponseEntity<List<SchoolClassResponse>> getMyClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
                schoolClassService.getMyClasses(userDetails.getUsername()));
    }

    /**
     * GET /api/enseignant/classes/{classId}/students
     * Retourne les élèves d'une classe avec progression et couleur de groupe.
     */
    @GetMapping("/{classId}/students")
    @Operation(summary = "Lister les élèves d'une classe avec leur progression")
    public ResponseEntity<List<StudentSummaryResponse>> getClassStudents(
            @PathVariable Long classId,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
                schoolClassService.getClassStudents(classId, userDetails.getUsername()));
    }

    /**
     * POST /api/enseignant/classes/{classId}/students/{studentId}
     * Ajoute un élève à la classe.
     */
    @PostMapping("/{classId}/students/{studentId}")
    @Operation(summary = "Ajouter un élève à une classe")
    public ResponseEntity<Void> addStudent(
            @PathVariable Long classId,
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserDetails userDetails) {

        schoolClassService.addStudentToClass(classId, studentId, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * DELETE /api/enseignant/classes/{classId}/students/{studentId}
     * Retire un élève de la classe.
     */
    @DeleteMapping("/{classId}/students/{studentId}")
    @Operation(summary = "Retirer un élève d'une classe")
    public ResponseEntity<Void> removeStudent(
            @PathVariable Long classId,
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserDetails userDetails) {

        schoolClassService.removeStudentFromClass(classId, studentId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/enseignant/classes/{classId}
     * Supprime une classe (impossible si des élèves y sont inscrits).
     */
    @DeleteMapping("/{classId}")
    @Operation(summary = "Supprimer une classe")
    public ResponseEntity<Void> deleteClass(
            @PathVariable Long classId,
            @AuthenticationPrincipal UserDetails userDetails) {

        schoolClassService.deleteClass(classId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
