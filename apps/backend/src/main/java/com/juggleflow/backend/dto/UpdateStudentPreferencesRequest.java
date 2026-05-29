package com.juggleflow.backend.dto;

import lombok.Data;

@Data
public class UpdateStudentPreferencesRequest {

    /** Absent ou null : ne pas modifier. */
    private Boolean practiceRemindersEnabled;

    /** Absent ou null : ne pas modifier. */
    private Boolean darkModeEnabled;
}
