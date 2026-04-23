// filename: backend/src/main/java/com/juggleflow/backend/dto/LearningPathResponse.java
package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.LearningPath;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LearningPathResponse {

    private Long id;
    private String pathName;
    private String description;
    private String targetLevel;
    private Integer estimatedDurationDays;
    private int stepCount;
    private List<String> trickNames;

    /**
     * Construit un LearningPathResponse à partir de l'entité JPA.
     * Inclut le nombre d'étapes et les noms des figures dans l'ordre.
     *
     * @param lp l'entité LearningPath (avec steps chargés)
     * @return le DTO correspondant
     */
    public static LearningPathResponse from(LearningPath lp) {
        List<String> tricks = lp.getSteps() == null ? List.of()
                : lp.getSteps().stream()
                    .map(step -> step.getTrick().getName())
                    .toList();

        return LearningPathResponse.builder()
                .id(lp.getId())
                .pathName(lp.getPathName())
                .description(lp.getDescription())
                .targetLevel(lp.getTargetLevel() != null
                    ? lp.getTargetLevel().name() : null)
                .estimatedDurationDays(lp.getEstimatedDurationDays())
                .stepCount(tricks.size())
                .trickNames(tricks)
                .build();
    }
}
