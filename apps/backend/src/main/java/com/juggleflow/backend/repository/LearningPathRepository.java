package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.LearningPath;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {

    @EntityGraph(attributePaths = {"steps", "steps.trick"})
    Optional<LearningPath> findWithStepsById(Long id);

    @EntityGraph(attributePaths = {"steps", "steps.trick"})
    List<LearningPath> findByActiveTrue();

    @EntityGraph(attributePaths = {"steps", "steps.trick"})
    List<LearningPath> findByActiveTrueAndTargetLevel(LearningPath.TargetLevel targetLevel);
}
