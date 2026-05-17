package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.PedagogicalResourceResponse;
import com.juggleflow.backend.service.PedagogicalResourceService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/resources")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMINISTRATEUR')")
@SecurityRequirement(name = "bearerAuth")
public class AdminPedagogicalResourceController {

    private final PedagogicalResourceService resourceService;

    /**
     * POST /api/admin/resources/{id}/file — dépose un PDF pour une ressource existante.
     */
    @PostMapping(value = "/{id}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PedagogicalResourceResponse> uploadFile(
        @PathVariable Long id,
        @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.ok(resourceService.uploadPdf(id, file));
    }
}
