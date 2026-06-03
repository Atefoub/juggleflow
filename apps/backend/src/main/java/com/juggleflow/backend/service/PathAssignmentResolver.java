package com.juggleflow.backend.service;

import com.juggleflow.backend.model.ClassLearningPath;
import com.juggleflow.backend.model.LearningPath;
import com.juggleflow.backend.model.LearningPathStep;
import com.juggleflow.backend.model.StudentLearningPath;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.StudentLearningPathRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Résout le parcours effectif d'un élève : assignation individuelle en priorité,
 * sinon premier parcours assigné à la classe.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PathAssignmentResolver {

    public enum AssignmentSource {
        STUDENT,
        CLASS
    }

    public record ResolvedPath(
            LearningPath path,
            AssignmentSource source,
            java.time.LocalDate startDate,
            java.time.LocalDate expectedEndDate) {}

    private final StudentLearningPathRepository studentLearningPathRepository;
    private final ClassLearningPathRepository classLearningPathRepository;

    public Optional<ResolvedPath> resolvePrimaryPath(Long studentId, Long classId) {
        List<StudentLearningPath> studentAssignments =
                studentLearningPathRepository.findWithPathsByStudent_Id(studentId);
        if (!studentAssignments.isEmpty()) {
            StudentLearningPath assignment = studentAssignments.getFirst();
            LearningPath path = assignment.getLearningPath();
            return Optional.of(new ResolvedPath(
                    path,
                    AssignmentSource.STUDENT,
                    assignment.getStartDate(),
                    assignment.getExpectedEndDate()));
        }

        if (classId == null) {
            return Optional.empty();
        }

        return classLearningPathRepository.findWithPathsBySchoolClass_Id(classId).stream()
                .findFirst()
                .map(this::toResolvedFromClass);
    }

    public List<LearningPathStep> resolvePrimaryPathSteps(Long studentId, Long classId) {
        return resolvePrimaryPath(studentId, classId)
                .map(resolved -> resolved.path().getSteps())
                .orElse(List.of());
    }

    public List<LearningPath> resolveAllPathsForStudent(Long studentId, Long classId) {
        List<StudentLearningPath> studentAssignments =
                studentLearningPathRepository.findWithPathsByStudent_Id(studentId);
        if (!studentAssignments.isEmpty()) {
            return studentAssignments.stream()
                    .map(StudentLearningPath::getLearningPath)
                    .distinct()
                    .toList();
        }
        if (classId == null) {
            return List.of();
        }
        return classLearningPathRepository.findWithPathsBySchoolClass_Id(classId).stream()
                .map(ClassLearningPath::getLearningPath)
                .distinct()
                .toList();
    }

    private ResolvedPath toResolvedFromClass(ClassLearningPath assignment) {
        LearningPath path = assignment.getLearningPath();
        return new ResolvedPath(
                path,
                AssignmentSource.CLASS,
                assignment.getStartDate(),
                assignment.getExpectedEndDate());
    }
}
