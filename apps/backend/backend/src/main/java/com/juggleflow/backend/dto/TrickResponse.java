package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.Trick;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TrickResponse {

    private Long id;
    private String name;
    private String siteswap;
    private String description;
    private String jugglingLabAnimationUrl;
    private Integer difficultyScore;
    private Integer estimatedLearningDuration;
    private boolean popular;
    private String levelName;
    private String categoryName;
    private List<String> prerequisiteNames;

    public static TrickResponse from(Trick trick) {
        return TrickResponse.builder()
                .id(trick.getId())
                .name(trick.getName())
                .siteswap(trick.getSiteswap())
                .description(trick.getDescription())
                .jugglingLabAnimationUrl(trick.getJugglingLabAnimationUrl())
                .difficultyScore(trick.getDifficultyScore())
                .estimatedLearningDuration(trick.getEstimatedLearningDuration())
                .popular(trick.isPopular())
                .levelName(trick.getLevel() != null ? trick.getLevel().getName() : null)
                .categoryName(trick.getCategory() != null ? trick.getCategory().getName() : null)
                .prerequisiteNames(
                    trick.getPrerequisites() != null
                        ? trick.getPrerequisites().stream().map(Trick::getName).toList()
                        : List.of()
                )
                .build();
    }
}
