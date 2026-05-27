package com.juggleflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class StudentOnboardingRequest {

    @NotBlank
    @Pattern(regexp = "BEGINNER|INTERMEDIATE|ADVANCED|EXPERT")
    private String level;
}
