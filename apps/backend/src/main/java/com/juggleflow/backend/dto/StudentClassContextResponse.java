package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentClassContextResponse {

    private Long classId;
    private String className;
    private StudentSummaryResponse student;
}
