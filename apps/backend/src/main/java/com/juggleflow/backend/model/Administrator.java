package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Administrateur — table "administrator" en base, hérite de "users".
 */
@Entity
@Table(name = "administrator")
@DiscriminatorValue("administrator")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Administrator extends User {

    @Column(name = "admin_role", length = 50)
    @Builder.Default
    private String adminRole = "school_admin";

    @Override
    public String getRole() {
        return "ROLE_ADMINISTRATEUR";
    }
}
