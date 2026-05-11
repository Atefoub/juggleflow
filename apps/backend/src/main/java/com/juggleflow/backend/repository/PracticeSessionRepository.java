package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.PracticeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PracticeSessionRepository extends JpaRepository<PracticeSession, Long> {

    /**
     * Total cumule de pratique pour un utilisateur, en secondes.
     * Retourne 0 si aucune session.
     */
    @Query("""
        SELECT COALESCE(SUM(ps.durationSeconds), 0)
        FROM PracticeSession ps
        WHERE ps.user.id = :userId
        """)
    long sumDurationSecondsByUserId(@Param("userId") Long userId);
}
