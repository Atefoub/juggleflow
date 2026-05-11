package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.AdminAuditEventResponse;
import com.juggleflow.backend.dto.AdminCreateSchoolClassRequest;
import com.juggleflow.backend.dto.AdminCreateUserRequest;
import com.juggleflow.backend.dto.AdminCreateUserResponse;
import com.juggleflow.backend.dto.AdminEstablishmentStatsResponse;
import com.juggleflow.backend.dto.AdminSetEnabledRequest;
import com.juggleflow.backend.dto.AdminUpdateSchoolClassRequest;
import com.juggleflow.backend.dto.AdminUserResponse;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.dto.StudentSummaryResponse;
import com.juggleflow.backend.service.AdminAuditService;
import com.juggleflow.backend.service.AdminService;
import com.juggleflow.backend.service.SchoolClassService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Administration", description = "Administration : classes et utilisateurs")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService adminService;
    private final SchoolClassService schoolClassService;
    private final AdminAuditService adminAuditService;

    /**
     * GET /api/admin/stats
     * Agrégats établissement (effectifs, comptes actifs).
     */
    @GetMapping("/stats")
    @Operation(summary = "Statistiques établissement (admin)")
    public ResponseEntity<AdminEstablishmentStatsResponse> getEstablishmentStats() {
        return ResponseEntity.ok(adminService.getEstablishmentStats());
    }

    /**
     * GET /api/admin/audit-events
     * Dernières entrées du journal d'audit administration.
     */
    @GetMapping("/audit-events")
    @Operation(summary = "Journal d'audit administration")
    public ResponseEntity<List<AdminAuditEventResponse>> listAuditEvents(
        @RequestParam(defaultValue = "100") int limit) {

        return ResponseEntity.ok(adminAuditService.listRecent(limit));
    }

    /**
     * GET /api/admin/classes
     * Liste toutes les classes (administration).
     */
    @GetMapping("/classes")
    @Operation(summary = "Lister toutes les classes (admin)")
    public ResponseEntity<List<SchoolClassResponse>> getAllClasses() {
        return ResponseEntity.ok(adminService.getAllClasses());
    }

    /**
     * POST /api/admin/classes
     * Crée une classe en désignant le titulaire (enseignant).
     */
    @PostMapping("/classes")
    @Operation(summary = "Créer une classe (admin)")
    public ResponseEntity<SchoolClassResponse> createClass(
        @Valid @RequestBody AdminCreateSchoolClassRequest body,
        @AuthenticationPrincipal UserDetails principal) {

        SchoolClassResponse created = schoolClassService.createClassAsAdmin(body);
        adminAuditService.record(
            principal.getUsername(),
            "CLASS_CREATED",
            "classId=" + created.getId() + ", name=" + created.getName() + ", year=" + created.getSchoolYear());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PATCH /api/admin/classes/{id}
     * Met à jour une classe (champs fournis uniquement).
     */
    @PatchMapping("/classes/{id}")
    @Operation(summary = "Mettre à jour une classe (admin)")
    public ResponseEntity<SchoolClassResponse> updateClass(
        @PathVariable long id,
        @Valid @RequestBody AdminUpdateSchoolClassRequest body,
        @AuthenticationPrincipal UserDetails principal) {

        SchoolClassResponse updated = schoolClassService.updateClassAsAdmin(id, body);
        adminAuditService.record(
            principal.getUsername(),
            "CLASS_UPDATED",
            "classId=" + id + ", name=" + updated.getName() + ", year=" + updated.getSchoolYear());
        return ResponseEntity.ok(updated);
    }

    /**
     * GET /api/admin/classes/{id}/students
     * Liste les élèves d'une classe avec agrégats de progression.
     */
    @GetMapping("/classes/{id}/students")
    @Operation(summary = "Lister les élèves d'une classe (admin)")
    public ResponseEntity<List<StudentSummaryResponse>> getClassStudents(@PathVariable long id) {
        return ResponseEntity.ok(schoolClassService.getClassStudentsAsAdmin(id));
    }

    /**
     * DELETE /api/admin/classes/{id}
     * Supprime une classe vide (sans élève inscrit).
     */
    @DeleteMapping("/classes/{id}")
    @Operation(summary = "Supprimer une classe vide (admin)")
    public ResponseEntity<Void> deleteClass(
        @PathVariable long id,
        @AuthenticationPrincipal UserDetails principal) {

        schoolClassService.deleteClassAsAdmin(id);
        adminAuditService.record(principal.getUsername(), "CLASS_DELETED", "classId=" + id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/admin/users
     * Liste tous les utilisateurs (administration).
     */
    @GetMapping("/users")
    @Operation(summary = "Lister tous les utilisateurs (admin)")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    /**
     * POST /api/admin/users
     * Cree un utilisateur (eleve / enseignant / administrateur).
     * Le mot de passe est genere par le serveur s'il n'est pas fourni
     * et renvoye UNE SEULE FOIS dans la reponse pour transmission a
     * l'utilisateur final.
     */
    @PostMapping("/users")
    @Operation(summary = "Creer un utilisateur (admin)")
    public ResponseEntity<AdminCreateUserResponse> createUser(
        @Valid @RequestBody AdminCreateUserRequest body,
        @AuthenticationPrincipal UserDetails principal) {

        AdminCreateUserResponse created = adminService.createUser(body);
        adminAuditService.record(
            principal.getUsername(),
            "USER_CREATED",
            "userId=" + created.getId()
                + ", role=" + created.getRole()
                + ", email=" + created.getEmail()
                + (created.getClassId() != null ? ", classId=" + created.getClassId() : "")
                + (created.getGeneratedPassword() != null ? ", password=generated" : ", password=provided"));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PATCH /api/admin/users/{id}/enabled
     * Active ou désactive un compte (élève, enseignant ou administrateur).
     */
    @PatchMapping("/users/{id}/enabled")
    @Operation(summary = "Activer ou désactiver un utilisateur")
    public ResponseEntity<Void> setUserEnabled(
        @PathVariable long id,
        @Valid @RequestBody AdminSetEnabledRequest body,
        @AuthenticationPrincipal UserDetails principal) {

        adminService.setUserEnabled(id, body.getEnabled(), principal.getUsername());
        adminAuditService.record(
            principal.getUsername(),
            body.getEnabled() ? "USER_ENABLED" : "USER_DISABLED",
            "userId=" + id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/admin/progress/export?schoolYear=2026
     * Exporte un bilan de progression au format CSV.
     */
    @GetMapping(value = "/progress/export", produces = "text/csv")
    @Operation(summary = "Exporter le bilan de progression (CSV)")
    public ResponseEntity<String> exportProgressCsv(
        @RequestParam(required = false) Integer schoolYear) {

        String csv = adminService.exportProgressCsv(schoolYear);
        String filename = schoolYear != null
            ? "progress_report_" + schoolYear + ".csv"
            : "progress_report.csv";

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .body(csv);
    }
}
