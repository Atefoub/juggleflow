package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.AdminUserResponse;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Administration", description = "Administration : classes et utilisateurs")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService adminService;

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
     * GET /api/admin/users
     * Liste tous les utilisateurs (administration).
     */
    @GetMapping("/users")
    @Operation(summary = "Lister tous les utilisateurs (admin)")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
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

