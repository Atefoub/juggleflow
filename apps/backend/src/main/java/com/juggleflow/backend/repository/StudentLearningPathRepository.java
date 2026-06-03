package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.StudentLearningPath;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentLearningPathRepository extends JpaRepository<StudentLearningPath, Long> {

    @EntityGraph(attributePaths = {
        "learningPath",
        "learningPath.steps",
        "learningPath.steps.trick"
    })
    List<StudentLearningPath> findWithPathsByStudent_Id(Long studentId);

    Optional<StudentLearningPath> findByLearningPath_IdAndStudent_Id(
            Long learningPathId,
            Long studentId);

    void deleteByLearningPath_IdAndStudent_Id(Long learningPathId, Long studentId);
}
