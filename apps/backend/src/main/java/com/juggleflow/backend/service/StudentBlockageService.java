package com.juggleflow.backend.service;

import com.juggleflow.backend.model.LearningPathStep;
import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Détecte les élèves bloqués sur la figure courante d'un parcours assigné
 * Bloqué si ≥ 3 tentatives sur l'étape courante sans maîtrise.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudentBlockageService {

    public static final int MIN_ATTEMPTS_FOR_BLOCKAGE = 3;

    private final ClassLearningPathRepository classLearningPathRepository;
    private final UserProgressRepository userProgressRepository;

    public record BlockageInfo(Long trickId, String trickName, int attemptCount) {}

    public Optional<BlockageInfo> findBlockageForStudentInClass(Long studentId, Long classId) {
        List<LearningPathStep> steps = resolvePrimaryPathSteps(classId);
        if (steps.isEmpty()) {
            return Optional.empty();
        }
        return findBlockageOnPath(steps, studentId);
    }

    public Optional<BlockageInfo> findBlockageOnPath(List<LearningPathStep> steps, Long studentId) {
        Map<Long, UserProgress> byTrickId = userProgressRepository.findByUser_Id(studentId).stream()
                .collect(Collectors.toMap(p -> p.getTrick().getId(), p -> p, (a, b) -> a));
        return findBlockageOnPath(steps, byTrickId);
    }

    public Optional<BlockageInfo> findBlockageOnPath(
            List<LearningPathStep> steps,
            Map<Long, UserProgress> progressByTrickId) {

        for (LearningPathStep step : steps) {
            UserProgress progress = progressByTrickId.get(step.getTrick().getId());
            if (progress == null
                    || progress.getStatus() == UserProgress.ProgressStatus.NOT_STARTED) {
                return Optional.empty();
            }
            if (progress.getStatus() == UserProgress.ProgressStatus.MASTERED) {
                continue;
            }
            if (isBlocked(progress)) {
                return Optional.of(new BlockageInfo(
                        step.getTrick().getId(),
                        step.getTrick().getName(),
                        progress.getAttemptCount()));
            }
            return Optional.empty();
        }
        return Optional.empty();
    }

    public static boolean isBlocked(UserProgress progress) {
        return progress != null
                && progress.getStatus() == UserProgress.ProgressStatus.IN_PROGRESS
                && progress.getAttemptCount() >= MIN_ATTEMPTS_FOR_BLOCKAGE;
    }

    private List<LearningPathStep> resolvePrimaryPathSteps(Long classId) {
        return classLearningPathRepository.findBySchoolClass_Id(classId).stream()
                .findFirst()
                .map(assignment -> {
                    var path = assignment.getLearningPath();
                    path.getSteps().size();
                    return path.getSteps();
                })
                .orElse(List.of());
    }
}
