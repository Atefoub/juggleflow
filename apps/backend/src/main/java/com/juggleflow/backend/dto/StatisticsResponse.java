package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StatisticsResponse {
    private long totalTricksLearned;
    private long tricksInProgress;
    private long badgesEarned;
}
