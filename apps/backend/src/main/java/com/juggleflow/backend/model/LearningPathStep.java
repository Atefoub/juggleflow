// filename: backend/src/main/java/com/juggleflow/backend/model/LearningPathStep.java
package com.juggleflow.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Étape ordonnée d'un parcours pédagogique.
 * Correspond à la table "learning_path_step" du schéma PostgreSQL.
 */
@Entity
@Table(
    name = "learning_path_step",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"learning_path_id", "step_order"}),
        @UniqueConstraint(columnNames = {"learning_path_id", "trick_id"})
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningPathStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "step_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_path_id", nullable = false)
    private LearningPath learningPath;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trick_id", nullable = false)
    private Trick trick;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "min_practice_time")
    private Integer minPracticeTime;
}
