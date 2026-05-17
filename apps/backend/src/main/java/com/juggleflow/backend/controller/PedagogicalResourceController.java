package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.PedagogicalResourceResponse;
import com.juggleflow.backend.model.PedagogicalResource;
import com.juggleflow.backend.model.PedagogicalResource.Audience;
import com.juggleflow.backend.model.PedagogicalResource.ResourceType;
import com.juggleflow.backend.service.PedagogicalResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class PedagogicalResourceController {

    private final PedagogicalResourceService resourceService;

    /**
     * GET /api/resources?audience=TEACHER|STUDENT&type=STUDY_PDF (optionnel)
     */
    @GetMapping
    public ResponseEntity<List<PedagogicalResourceResponse>> list(
        @RequestParam String audience,
        @RequestParam(required = false) String type
    ) {
        Audience parsedAudience = Audience.valueOf(audience.trim().toUpperCase());
        ResourceType parsedType = type == null || type.isBlank()
            ? null
            : ResourceType.valueOf(type.trim().toUpperCase());

        return ResponseEntity.ok(resourceService.list(parsedAudience, parsedType));
    }

    /**
     * GET /api/resources/{id}/download — PDF stocké côté serveur (authentification requise).
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        Resource file = resourceService.loadDownloadFile(id);
        PedagogicalResource meta = resourceService.findActiveById(id);
        String filename = sanitizeFilename(meta.getTitle()) + ".pdf";

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .body(file);
    }

    private static String sanitizeFilename(String title) {
        if (title == null || title.isBlank()) {
            return "resource";
        }
        return title.replaceAll("[^a-zA-Z0-9._-]+", "_").substring(0, Math.min(80, title.length()));
    }
}
