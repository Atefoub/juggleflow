package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.StudentClassContextResponse;
import com.juggleflow.backend.dto.StudentLookupResponse;
import com.juggleflow.backend.service.SchoolClassService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/enseignant/students")
@RequiredArgsConstructor
@Tag(name = "Élèves (enseignant)", description = "Recherche et gestion des élèves par les enseignants")
@SecurityRequirement(name = "bearerAuth")
public class TeacherStudentController {

    private final SchoolClassService schoolClassService;

    /**
     * GET /api/enseignant/students/lookup?email=...&classId=...
     * Recherche un compte élève par e-mail (pour l'ajout à une classe).
     */
    @GetMapping("/lookup")
    @Operation(summary = "Rechercher un élève par e-mail")
    public ResponseEntity<StudentLookupResponse> lookupStudent(
            @RequestParam String email,
            @RequestParam Long classId,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(
                schoolClassService.lookupStudentByEmail(
                        email, classId, userDetails.getUsername()));
    }

    /**
     * GET /api/enseignant/students/{studentId}/context
     * Classe et résumé de l'élève pour la fiche détail (un seul appel).
     */
    @GetMapping("/{studentId}/context")
    @Operation(summary = "Contexte classe d'un élève")
    public ResponseEntity<StudentClassContextResponse> getStudentContext(
            @PathVariable Long studentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                schoolClassService.getStudentClassContext(
                        studentId, userDetails.getUsername()));
    }
}
