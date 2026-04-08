package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Niveau de difficulté — beginner, intermediate, advanced, expert.
 */
@Entity
@Table(name = "difficulty_level")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DifficultyLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "level_id")
    private Long id;

    @Column(name = "level_name", unique = true, nullable = false, length = 50)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "progression_order", unique = true, nullable = false)
    private Integer progressionOrder;
}
