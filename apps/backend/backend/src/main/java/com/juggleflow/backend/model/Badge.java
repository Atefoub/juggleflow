package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "badge")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Badge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "badge_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "badge_type_id", nullable = false)
    private BadgeType badgeType;

    @Column(name = "badge_name", unique = true, nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "icon_url", columnDefinition = "TEXT")
    private String iconUrl;

    /**
     * Critères de déblocage stockés en JSON.
     * Ex: {"type":"tricks_mastered","count":5}
     */
    @Column(name = "unlock_criteria", nullable = false, columnDefinition = "TEXT")
    private String unlockCriteria;

    @Column(name = "experience_points")
    @Builder.Default
    private Integer experiencePoints = 0;

    @Column(name = "difficulty_order")
    private Integer difficultyOrder;
}
