package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.DailyChallenge;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

/**
 * Reponse "defi du jour" exposee a l'eleve.
 *
 * {@code trickId} / {@code trickName} sont null quand le defi n'est pas
 * rattache a une figure du catalogue (ex : echauffement libre).
 */
@Value
@Builder
public class DailyChallengeResponse {

    Long id;
    Integer rotationSlot;
    String title;
    String description;
    Long trickId;
    String trickName;
    Integer targetValue;
    String targetUnit;
    LocalDate date;

    public static DailyChallengeResponse from(DailyChallenge challenge, LocalDate date) {
        return DailyChallengeResponse.builder()
            .id(challenge.getId())
            .rotationSlot(challenge.getRotationSlot())
            .title(challenge.getTitle())
            .description(challenge.getDescription())
            .trickId(challenge.getTargetTrick() != null ? challenge.getTargetTrick().getId() : null)
            .trickName(challenge.getTargetTrick() != null ? challenge.getTargetTrick().getName() : null)
            .targetValue(challenge.getTargetValue())
            .targetUnit(challenge.getTargetUnit())
            .date(date)
            .build();
    }
}
