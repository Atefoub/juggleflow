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
 * Association entre un parcours pédagogique et un élève.
 * Prioritaire sur {@link ClassLearningPath} pour la résolution du parcours effectif.
 */
@Entity
@Table(
    name = "student_learning_path",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"student_id", "learning_path_id"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentLearningPath {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "student_learning_path_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_path_id", nullable = false)
    private LearningPath learningPath;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "expected_end_date")
    private LocalDate expectedEndDate;

    @AssertTrue(message = "La date de fin doit être postérieure ou égale à la date de début")
    public boolean isEndDateValid() {
        if (expectedEndDate == null) {
            return true;
        }
        return !expectedEndDate.isBefore(startDate);
    }
}
