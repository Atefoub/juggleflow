package com.juggleflow.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStudentPreferencesRequest {

    @NotNull
    private Boolean practiceRemindersEnabled;
}
