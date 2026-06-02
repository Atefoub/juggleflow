package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.StudentLearningPath;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentLearningPathRepository extends JpaRepository<StudentLearningPath, Long> {

    List<StudentLearningPath> findByStudent_Id(Long studentId);

    Optional<StudentLearningPath> findByLearningPath_IdAndStudent_Id(
            Long learningPathId,
            Long studentId);

    void deleteByLearningPath_IdAndStudent_Id(Long learningPathId, Long studentId);
}
