package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.ClassLearningPath;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClassLearningPathRepository extends JpaRepository<ClassLearningPath, Long> {

    @EntityGraph(attributePaths = {
        "learningPath",
        "learningPath.steps",
        "learningPath.steps.trick"
    })
    List<ClassLearningPath> findWithPathsBySchoolClass_Id(Long classId);

    /**
     * Vérifie si un parcours est déjà assigné à une classe.
     */
    Optional<ClassLearningPath> findByLearningPath_IdAndSchoolClass_Id(
            Long learningPathId, Long classId);

    /**
     * Supprime l'assignation d'un parcours à une classe.
     */
    void deleteByLearningPath_IdAndSchoolClass_Id(Long learningPathId, Long classId);
}
