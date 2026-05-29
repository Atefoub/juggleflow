package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentPreferencesResponse {

    private boolean practiceRemindersEnabled;
    private boolean darkModeEnabled;
}
