package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.PedagogicalResourceResponse;
import com.juggleflow.backend.model.PedagogicalResource.Audience;
import com.juggleflow.backend.model.PedagogicalResource.ResourceType;
import com.juggleflow.backend.service.PedagogicalResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
}
