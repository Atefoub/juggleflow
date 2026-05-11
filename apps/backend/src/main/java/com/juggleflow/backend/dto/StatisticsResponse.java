package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Statistiques agregees exposees aux ecrans Dashboard/Profil/Progression.
 *
 * - currentStreakDays / longestStreakDays : alimentes par {@code user_streak}.
 * - totalPracticeMinutes : somme des {@code practice_session.duration_seconds},
 *   exposee en minutes pour le confort d'affichage cote frontend.
 */
@Data
@Builder
public class StatisticsResponse {
    private long totalTricksLearned;
    private long tricksInProgress;
    private long badgesEarned;
    private int currentStreakDays;
    private int longestStreakDays;
    private long totalPracticeMinutes;
}
