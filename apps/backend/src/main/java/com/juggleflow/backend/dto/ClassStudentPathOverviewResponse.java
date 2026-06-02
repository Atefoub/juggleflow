package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ClassStudentPathOverviewResponse {

    private Long studentId;
    private String firstName;
    private String lastName;
    private Long learningPathId;
    private String pathName;
    private int completionPercent;
    private String assignmentSource;
}
