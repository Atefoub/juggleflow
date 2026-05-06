package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.AdminUserResponse;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
}

