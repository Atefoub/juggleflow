// filename: backend/src/main/java/com/juggleflow/backend/dto/StudentPathProgressResponse.java
package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StudentPathProgressResponse {

    private Long studentId;
    private String firstName;
    private String lastName;
    private int completionPercent;
    private int masteredCount;
    private int totalSteps;
    private List<TrickProgressDetail> trickDetails;

    @Data
    @Builder
    public static class TrickProgressDetail {
        private Long trickId;
        private String trickName;
        private String status;
        private int attemptCount;
        private Integer masteryPercentage;
        private boolean blocked;
    }
}
