package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.model.UserProgress.ProgressStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserProgressRepository extends JpaRepository<UserProgress, Long> {

    interface ProgressAggregateRow {
        Long getUserId();
        long getTotalTricks();
        long getMasteredTricks();
        long getInProgressTricks();
        Instant getLastPracticeAt();
    }

    List<UserProgress> findByUser_Id(Long userId);

    List<UserProgress> findByUser_IdAndStatus(Long userId, ProgressStatus status);

    Optional<UserProgress> findByUser_IdAndTrick_Id(Long userId, Long trickId);

    boolean existsByUser_IdAndTrick_Id(Long userId, Long trickId);

    @Query("""
        SELECT COUNT(p) FROM UserProgress p
        WHERE p.user.id = :userId
        AND p.status = 'MASTERED'
        """)
    long countMasteredByUserId(@Param("userId") Long userId);

    /**
     * Agrégats de progression par utilisateur (optimisation export admin).
     * - totalTricks      : nombre de figures ayant une entrée user_progress (quel que soit le status)
     * - masteredTricks   : nombre de figures MASTERED
     * - inProgressTricks : nombre de figures IN_PROGRESS
     * - lastPracticeAt   : dernière date de pratique (max lastPractice)
     */
    @Query("""
        SELECT
            p.user.id AS userId,
            COUNT(p) AS totalTricks,
            SUM(CASE WHEN p.status = 'MASTERED' THEN 1 ELSE 0 END) AS masteredTricks,
            SUM(CASE WHEN p.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgressTricks,
            MAX(p.lastPractice) AS lastPracticeAt
        FROM UserProgress p
        WHERE p.user.id IN :userIds
        GROUP BY p.user.id
        """)
    List<ProgressAggregateRow> aggregateProgressByUserIds(@Param("userIds") List<Long> userIds);
}
