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
import jakarta.validation.constraints.AssertTrue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Association entre un parcours pédagogique et une classe scolaire,
 * avec une période de validité.
 * Correspond à la table "class_learning_path" du schéma PostgreSQL.
 */
@Entity
@Table(
    name = "class_learning_path",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"learning_path_id", "class_id"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassLearningPath {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "class_learning_path_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_path_id", nullable = false)
    private LearningPath learningPath;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private SchoolClass schoolClass;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "expected_end_date")
    private LocalDate expectedEndDate;

    /**
     * La date de fin ne peut pas être antérieure à la date de début.
     */
    @AssertTrue(message = "La date de fin doit être postérieure ou égale à la date de début")
    public boolean isEndDateValid() {
        if (expectedEndDate == null) return true;
        return !expectedEndDate.isBefore(startDate);
    }
}
