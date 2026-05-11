package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.CreateStudentGroupRequest;
import com.juggleflow.backend.dto.ReorderGroupsRequest;
import com.juggleflow.backend.dto.StudentGroupResponse;
import com.juggleflow.backend.dto.UpdateGroupMembersRequest;
import com.juggleflow.backend.dto.UpdateStudentGroupRequest;
import com.juggleflow.backend.service.StudentGroupService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Endpoints CRUD + drag-and-drop pour les groupes pédagogiques d'une classe.
 *
 * <p>Tous protégés par {@link StudentGroupService#listGroups (et derives)} qui
 * vérifient l'ownership de la classe via {@code assertClassOwnership}.
 */
@RestController
@RequestMapping("/api/enseignant/classes/{classId}/groups")
@RequiredArgsConstructor
@Tag(name = "Groupes éleves", description = "Gestion des groupes pédagogiques d'une classe")
@SecurityRequirement(name = "bearerAuth")
public class StudentGroupController {

    private final StudentGroupService groupService;

    @GetMapping
    @Operation(summary = "Lister les groupes pédagogiques d'une classe")
    public ResponseEntity<List<StudentGroupResponse>> listGroups(
            @PathVariable Long classId,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(groupService.listGroups(classId, principal.getUsername()));
    }

    @PostMapping
    @Operation(summary = "Créer un groupe dans une classe")
    public ResponseEntity<StudentGroupResponse> createGroup(
            @PathVariable Long classId,
            @Valid @RequestBody CreateStudentGroupRequest body,
            @AuthenticationPrincipal UserDetails principal) {
        StudentGroupResponse created = groupService.createGroup(classId, body, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{groupId}")
    @Operation(summary = "Modifier le nom et/ou la couleur d'un groupe")
    public ResponseEntity<StudentGroupResponse> updateGroup(
            @PathVariable Long classId,
            @PathVariable Long groupId,
            @Valid @RequestBody UpdateStudentGroupRequest body,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(groupService.updateGroup(classId, groupId, body, principal.getUsername()));
    }

    @DeleteMapping("/{groupId}")
    @Operation(summary = "Supprimer un groupe")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable Long classId,
            @PathVariable Long groupId,
            @AuthenticationPrincipal UserDetails principal) {
        groupService.deleteGroup(classId, groupId, principal.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    @Operation(summary = "Réordonner les groupes d'une classe (drag-and-drop)")
    public ResponseEntity<List<StudentGroupResponse>> reorderGroups(
            @PathVariable Long classId,
            @Valid @RequestBody ReorderGroupsRequest body,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(groupService.reorderGroups(classId, body, principal.getUsername()));
    }

    @PutMapping("/{groupId}/members")
    @Operation(summary = "Remplacer les membres d'un groupe")
    public ResponseEntity<StudentGroupResponse> setMembers(
            @PathVariable Long classId,
            @PathVariable Long groupId,
            @Valid @RequestBody UpdateGroupMembersRequest body,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(groupService.setMembers(classId, groupId, body, principal.getUsername()));
    }
}
