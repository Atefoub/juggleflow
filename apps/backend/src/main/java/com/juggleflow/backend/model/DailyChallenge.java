package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Defi du jour : N entrees actives en base, rotation deterministe par
 * {@code rotationSlot = today.epochDay() % count(active)} cote service.
 *
 * Permet d'ajouter ou de retirer des defis sans toucher au code (vs.
 * une planification stricte par date fixe).
 */
@Entity
@Table(name = "daily_challenge")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rotation_slot", nullable = false, unique = true)
    private Integer rotationSlot;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_trick_id")
    private Trick targetTrick;

    @Column(name = "target_value")
    private Integer targetValue;

    @Column(name = "target_unit", length = 50)
    private String targetUnit;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
