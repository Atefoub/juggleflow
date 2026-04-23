package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.model.UserProgress.ProgressStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ProgressResponse {

    private Long trickId;
    private String trickName;
    private ProgressStatus status;
    private Integer masteryPercentage;
    private Integer attemptCount;
    private Instant startedAt;
    private Instant masteredAt;
    private Instant lastPractice;

    public static ProgressResponse from(UserProgress p) {
        return ProgressResponse.builder()
                .trickId(p.getTrick().getId())
                .trickName(p.getTrick().getName())
                .status(p.getStatus())
                .masteryPercentage(p.getMasteryPercentage())
                .attemptCount(p.getAttemptCount())
                .startedAt(p.getStartedAt())
                .masteredAt(p.getMasteredAt())
                .lastPractice(p.getLastPractice())
                .build();
    }
}
