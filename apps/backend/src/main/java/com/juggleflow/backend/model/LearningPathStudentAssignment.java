package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Assignation d'un parcours à un élève individuel (sous-ensemble d'une classe).
 *
 * <p>Coexiste avec {@link ClassLearningPath} (assignation à toute la classe) :
 * <ul>
 *   <li>{@link AssignmentSource#CLASS}      : ligne miroir d'une entrée
 *       {@code class_learning_path} (non utilisé pour l'instant, réservé).</li>
 *   <li>{@link AssignmentSource#INDIVIDUAL} : assignation directe d'un parcours
 *       à un élève donné, indépendamment de sa classe.</li>
 * </ul>
 *
 * <p>La contrainte unique {@code (learning_path_id, student_id)} garantit qu'un
 * élève ne voit jamais le même parcours en double.
 */
@Entity
@Table(name = "learning_path_student_assignment",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_path_student",
        columnNames = {"learning_path_id", "student_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningPathStudentAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "learning_path_id", nullable = false)
    private LearningPath learningPath;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AssignmentSource source = AssignmentSource.INDIVIDUAL;

    public enum AssignmentSource {
        CLASS, INDIVIDUAL
    }
}
