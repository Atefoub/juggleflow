package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.LearningPathStudentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LearningPathStudentAssignmentRepository
        extends JpaRepository<LearningPathStudentAssignment, Long> {

    List<LearningPathStudentAssignment> findByStudent_Id(Long studentId);

    List<LearningPathStudentAssignment> findByLearningPath_Id(Long learningPathId);

    /**
     * Récupère les assignations individuelles pour un parcours, mais filtrées
     * sur les élèves d'une classe donnée. Sert au calcul de progression côté
     * enseignant (la vue progrès reste centrée classe).
     */
    List<LearningPathStudentAssignment> findByLearningPath_IdAndStudent_SchoolClass_Id(
            Long learningPathId, Long classId);

    boolean existsByLearningPath_IdAndStudent_Id(Long learningPathId, Long studentId);

    void deleteByLearningPath_IdAndStudent_Id(Long learningPathId, Long studentId);

    void deleteByLearningPath_Id(Long learningPathId);
}
