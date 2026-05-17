package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.PedagogicalResourceResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.PedagogicalResource;
import com.juggleflow.backend.model.PedagogicalResource.Audience;
import com.juggleflow.backend.model.PedagogicalResource.ResourceType;
import com.juggleflow.backend.repository.PedagogicalResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PedagogicalResourceService {

    private final PedagogicalResourceRepository resourceRepository;
    private final ResourceStorageService storageService;

    @Transactional(readOnly = true)
    public List<PedagogicalResourceResponse> list(
        Audience audience,
        ResourceType resourceType
    ) {
        List<PedagogicalResource> resources = resourceType == null
            ? resourceRepository.findByAudienceAndActiveTrueOrderBySortOrderAsc(audience)
            : resourceRepository.findByAudienceAndResourceTypeAndActiveTrueOrderBySortOrderAsc(
                audience, resourceType);

        return resources.stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public PedagogicalResource findActiveById(Long id) {
        PedagogicalResource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ressource", id));
        if (!resource.isActive()) {
            throw new ResourceNotFoundException("Ressource", id);
        }
        return resource;
    }

    @Transactional(readOnly = true)
    public Resource loadDownloadFile(Long id) {
        PedagogicalResource resource = findActiveById(id);
        if (resource.getResourceUrl() != null && resource.getResourceUrl().startsWith("http")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Cette ressource est hébergée en externe.");
        }
        if (!storageService.hasStoredFile(id)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Fichier non disponible pour cette ressource.");
        }
        Path path = storageService.resolveStoredPath(id);
        try {
            Resource file = new UrlResource(path.toUri());
            if (!file.exists() || !file.isReadable()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier illisible.");
            }
            return file;
        } catch (MalformedURLException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Erreur lors de la lecture du fichier.");
        }
    }

    @Transactional
    public PedagogicalResourceResponse uploadPdf(Long id, MultipartFile file) {
        PedagogicalResource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ressource", id));

        storageService.storePdf(id, file);
        resource.setResourceUrl(storageService.publicDownloadPath(id));
        PedagogicalResource saved = resourceRepository.save(resource);
        return toResponse(saved);
    }

    private PedagogicalResourceResponse toResponse(PedagogicalResource resource) {
        String url = resolveEffectiveUrl(resource);
        return PedagogicalResourceResponse.from(resource, url);
    }

    private String resolveEffectiveUrl(PedagogicalResource resource) {
        if (resource.getResourceUrl() != null && !resource.getResourceUrl().isBlank()) {
            return resource.getResourceUrl();
        }
        if (storageService.hasStoredFile(resource.getId())) {
            return storageService.publicDownloadPath(resource.getId());
        }
        return null;
    }
}
