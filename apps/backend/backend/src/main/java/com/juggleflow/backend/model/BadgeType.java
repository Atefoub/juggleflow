package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "badge_type")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BadgeType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "badge_type_id")
    private Long id;

    @Column(name = "type_name", unique = true, nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 7)
    private String color;
}
