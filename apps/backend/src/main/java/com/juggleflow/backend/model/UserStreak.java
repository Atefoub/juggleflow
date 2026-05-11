package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Compteur de jours consecutifs ("streak") par utilisateur.
 * Mis a jour par {@link com.juggleflow.backend.service.StreakService#recordPracticeDay}
 * a chaque session de pratique enregistree.
 *
 * Modele 1-1 avec User : la PK = user_id. La relation {@code user} est
 * declaree en lecture seule ({@code insertable=false, updatable=false})
 * pour eviter qu'Hibernate ne tente une cascade PERSIST/MERGE vers une
 * entite User passee detachee (cas frequent en test).
 */
@Entity
@Table(name = "user_streak")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStreak {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(name = "current_streak_days", nullable = false)
    @Builder.Default
    private Integer currentStreakDays = 0;

    @Column(name = "longest_streak_days", nullable = false)
    @Builder.Default
    private Integer longestStreakDays = 0;

    @Column(name = "last_practice_date")
    private LocalDate lastPracticeDate;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
