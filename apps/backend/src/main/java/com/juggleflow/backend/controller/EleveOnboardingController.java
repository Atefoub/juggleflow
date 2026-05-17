package com.juggleflow.backend.controller;

import com.juggleflow.backend.dto.StudentOnboardingRequest;
import com.juggleflow.backend.dto.UserProfileResponse;
import com.juggleflow.backend.service.StudentOnboardingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/eleve/onboarding")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ELEVE')")
public class EleveOnboardingController {

    private final StudentOnboardingService studentOnboardingService;

    @PostMapping
    public ResponseEntity<UserProfileResponse> completeOnboarding(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody StudentOnboardingRequest request
    ) {
        var student = studentOnboardingService.completeOnboarding(
            userDetails.getUsername(), request);
        return ResponseEntity.ok(UserProfileResponse.from(student));
    }

    @PatchMapping
    public ResponseEntity<UserProfileResponse> updateLevel(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody StudentOnboardingRequest request
    ) {
        var student = studentOnboardingService.updateLevel(
            userDetails.getUsername(), request.getLevel());
        return ResponseEntity.ok(UserProfileResponse.from(student));
    }
}
