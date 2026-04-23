package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.List;

/**
 * Figure de jonglage — catalogue complet.
 * Correspond à la table "trick" du schéma PostgreSQL.
 */
@Entity
@Table(name = "trick")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trick {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trick_id")
    private Long id;

    @Column(name = "trick_name", unique = true, nullable = false, length = 255)
    private String name;

    @Column(length = 100)
    private String siteswap;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "juggling_lab_animation_url", columnDefinition = "TEXT")
    private String jugglingLabAnimationUrl;

    @Column(name = "difficulty_score")
    private Integer difficultyScore;

    @Column(name = "estimated_learning_duration")
    private Integer estimatedLearningDuration;

    @Column(nullable = false)
    @Builder.Default
    private boolean popular = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "level_id", nullable = false)
    private DifficultyLevel level;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToMany
    @JoinTable(
        name = "prerequisite",
        joinColumns = @JoinColumn(name = "trick_id"),
        inverseJoinColumns = @JoinColumn(name = "prerequisite_trick_id")
    )
    private List<Trick> prerequisites;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
