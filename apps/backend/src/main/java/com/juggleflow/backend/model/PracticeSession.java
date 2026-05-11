package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Session de pratique horodatee.
 * Alimente :
 *   - le badge "Marathon" (somme des durations >= seuil)
 *   - les stats "temps de pratique" du dashboard eleve.
 *
 * Trick optionnel : on autorise des sessions "libres" hors d'une figure
 * du catalogue (echauffement, exercice non reference, ...).
 */
@Entity
@Table(name = "practice_session")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PracticeSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trick_id")
    private Trick trick;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String source = "student_session";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
