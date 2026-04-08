package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

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

    @Override
    public String getRole() {
        return "ROLE_ELEVE";
    }
}
