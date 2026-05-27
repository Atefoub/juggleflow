package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Élève — table "student" en base, hérite de "users".
 */
@Entity
@Table(name = "student")
@DiscriminatorValue("student")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Student extends User {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private SchoolClass schoolClass;

    @Column(name = "school_level", length = 50)
    private String schoolLevel;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "enrollment_date")
    private LocalDate enrollmentDate;

    /** BEGINNER, INTERMEDIATE, ADVANCED ou EXPERT — déclaré à l'onboarding. */
    @Column(name = "juggling_level", length = 20)
    private String jugglingLevel;

    @Column(name = "onboarding_completed_at")
    private Instant onboardingCompletedAt;

    /**
     * Groupe assigné manuellement par l'enseignant (VERT, ORANGE, ROUGE).
     * {@code null} : dérivé automatiquement de la progression.
     */
    @Column(name = "assigned_group_color", length = 10)
    private String assignedGroupColor;

    @Column(name = "practice_reminders_enabled", nullable = false)
    @Builder.Default
    private boolean practiceRemindersEnabled = true;

    @Override
    public String getRole() {
        return "ROLE_ELEVE";
    }
}
