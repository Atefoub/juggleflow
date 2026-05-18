package com.juggleflow.backend.controller;

import com.juggleflow.backend.service.JugglingLabAnimationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * Proxy vers le serveur GIF Juggling Lab pour les balises {@code <img>}.
 */
@RestController
@RequestMapping("/api/juggling-lab")
@RequiredArgsConstructor
@Tag(name = "Juggling Lab", description = "Résolution des animations GIF (proxy)")
public class JugglingLabController {

    private final JugglingLabAnimationService jugglingLabAnimationService;

    /**
     * GET /api/juggling-lab/anim?pattern=3&width=400&height=450&slowdown=2
     * Redirige vers l'URL directe du GIF (compatible {@code <img src="...">}).
     */
    @GetMapping("/anim")
    @Operation(summary = "Rediriger vers le GIF Juggling Lab pour un siteswap")
    public ResponseEntity<Void> redirectToGif(
            @RequestParam String pattern,
            @RequestParam(required = false) Integer width,
            @RequestParam(required = false) Integer height,
            @RequestParam(required = false) Double slowdown) {

        String gifUrl = jugglingLabAnimationService.resolveGifUrl(
                pattern, width, height, slowdown);

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(gifUrl));
        headers.setCacheControl("public, max-age=86400");
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
