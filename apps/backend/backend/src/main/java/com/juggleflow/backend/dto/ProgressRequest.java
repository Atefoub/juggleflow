package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.UserProgress.ProgressStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProgressRequest {

    @NotNull(message = "Le statut est obligatoire")
    private ProgressStatus status;

    @Min(0) @Max(100)
    private Integer masteryPercentage;
}
