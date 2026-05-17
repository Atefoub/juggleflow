package com.juggleflow.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class ResourceStorageService {

    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final Path storageRoot;

    public ResourceStorageService(
        @Value("${app.resources.storage-dir:uploads/resources}") String storageDir
    ) {
        this.storageRoot = Path.of(storageDir).toAbsolutePath().normalize();
    }

    public void storePdf(Long resourceId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier PDF requis.");
        }
        String contentType = file.getContentType();
        if (contentType != null && !PDF_CONTENT_TYPE.equalsIgnoreCase(contentType)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Seuls les fichiers PDF sont acceptés.");
        }

        try {
            Files.createDirectories(storageRoot);
            Path target = resolveStoredPath(resourceId);
            file.transferTo(target);
        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Impossible d'enregistrer le fichier.");
        }
    }

    public boolean hasStoredFile(Long resourceId) {
        return Files.isRegularFile(resolveStoredPath(resourceId));
    }

    public Path resolveStoredPath(Long resourceId) {
        return storageRoot.resolve(resourceId + ".pdf");
    }

    public String publicDownloadPath(Long resourceId) {
        return "/api/resources/" + resourceId + "/download";
    }
}
