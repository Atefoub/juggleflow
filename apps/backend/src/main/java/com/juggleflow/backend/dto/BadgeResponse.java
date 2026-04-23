package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.UserBadge;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class BadgeResponse {

    private Long id;
    private String name;
    private String description;
    private String iconUrl;
    private Integer experiencePoints;
    private String badgeTypeName;
    private Instant unlockedAt;
    private boolean unlocked;

    public static BadgeResponse from(UserBadge ub) {
        return BadgeResponse.builder()
                .id(ub.getBadge().getId())
                .name(ub.getBadge().getName())
                .description(ub.getBadge().getDescription())
                .iconUrl(ub.getBadge().getIconUrl())
                .experiencePoints(ub.getBadge().getExperiencePoints())
                .badgeTypeName(ub.getBadge().getBadgeType() != null
                    ? ub.getBadge().getBadgeType().getName() : null)
                .unlockedAt(ub.getUnlockedAt())
                .unlocked(true)
                .build();
    }
}
