package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Enseignant — table "teacher" en base, hérite de "users".
 */
@Entity
@Table(name = "teacher")
@DiscriminatorValue("teacher")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Teacher extends User {

    @Column(name = "subjects_taught")
    private String subjectsTaught;

    @Column(nullable = false)
    @Builder.Default
    private boolean certified = false;

    @Override
    public String getRole() {
        return "ROLE_ENSEIGNANT";
    }
}
