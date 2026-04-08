package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Suivi détaillé de la progression de chaque figure par utilisateur.
 * Correspond à la table "user_progress" du schéma PostgreSQL.
 */
@Entity
@Table(name = "user_progress",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "trick_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "progress_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trick_id", nullable = false)
    private Trick trick;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProgressStatus status = ProgressStatus.NOT_STARTED;

    @Column(name = "mastery_percentage")
    @Builder.Default
    private Integer masteryPercentage = 0;

    @Column(name = "attempt_count")
    @Builder.Default
    private Integer attemptCount = 0;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "mastered_at")
    private Instant masteredAt;

    @Column(name = "last_practice")
    private Instant lastPractice;

    public enum ProgressStatus {
        NOT_STARTED,
        IN_PROGRESS,
        MASTERED
    }
}
