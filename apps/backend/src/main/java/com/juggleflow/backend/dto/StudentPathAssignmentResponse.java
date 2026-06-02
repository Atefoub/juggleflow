package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class StudentPathAssignmentResponse {

    private Long studentId;
    private Long learningPathId;
    private String pathName;
    private LocalDate startDate;
    private LocalDate expectedEndDate;
    /** CLASS = assignation classe ; STUDENT = assignation individuelle. */
    private String assignmentSource;
}
