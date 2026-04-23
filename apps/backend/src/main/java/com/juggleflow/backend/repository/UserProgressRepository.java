package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.model.UserProgress.ProgressStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserProgressRepository extends JpaRepository<UserProgress, Long> {

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
}
