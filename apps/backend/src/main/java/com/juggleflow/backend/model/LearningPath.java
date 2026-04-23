// filename: backend/src/main/java/com/juggleflow/backend/model/LearningPath.java
package com.juggleflow.backend.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Parcours pédagogique — séquence ordonnée de figures assignable à une classe.
 * Correspond à la table "learning_path" du schéma PostgreSQL.
 */
@Entity
@Table(name = "learning_path")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningPath {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "learning_path_id")
    private Long id;

    @Column(name = "path_name", nullable = false, length = 255)
    private String pathName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_level", nullable = false, length = 20)
    private TargetLevel targetLevel;

    @Column(name = "estimated_duration_days")
    private Integer estimatedDurationDays;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @OneToMany(
        mappedBy = "learningPath",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    @OrderBy("stepOrder ASC")
    @Builder.Default
    private List<LearningPathStep> steps = new ArrayList<>();

    public enum TargetLevel {
        BEGINNER,
        INTERMEDIATE,
        ADVANCED,
        EXPERT
    }
}
