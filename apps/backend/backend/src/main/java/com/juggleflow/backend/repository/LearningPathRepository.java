// filename: backend/src/main/java/com/juggleflow/backend/repository/LearningPathRepository.java
package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.LearningPath;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {

    /**
     * Retourne tous les parcours actifs.
     */
    List<LearningPath> findByActiveTrue();

    /**
     * Retourne les parcours actifs filtrés par niveau cible.
     */
    List<LearningPath> findByActiveTrueAndTargetLevel(LearningPath.TargetLevel targetLevel);
}
