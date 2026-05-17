package com.juggleflow.backend.service;

import com.juggleflow.backend.model.LearningPath;
import com.juggleflow.backend.model.LearningPathStep;
import com.juggleflow.backend.model.Trick;
import com.juggleflow.backend.model.UserProgress;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StudentBlockageServiceTest {

    private final StudentBlockageService service =
            new StudentBlockageService(null, null);

    @Test
    @DisplayName("isBlocked → true si IN_PROGRESS et attemptCount >= 3")
    void isBlocked_shouldBeTrue_whenInProgressWithEnoughAttempts() {
        UserProgress progress = UserProgress.builder()
                .status(UserProgress.ProgressStatus.IN_PROGRESS)
                .attemptCount(3)
                .build();

        assertTrue(StudentBlockageService.isBlocked(progress));
    }

    @Test
    @DisplayName("isBlocked → false si moins de 3 tentatives")
    void isBlocked_shouldBeFalse_whenAttemptsBelowThreshold() {
        UserProgress progress = UserProgress.builder()
                .status(UserProgress.ProgressStatus.IN_PROGRESS)
                .attemptCount(2)
                .build();

        assertFalse(StudentBlockageService.isBlocked(progress));
    }

    @Test
    @DisplayName("findBlockageOnPath → détecte la figure courante bloquée")
    void findBlockageOnPath_shouldDetectCurrentStuckTrick() {
        Trick cascade = Trick.builder().id(1L).name("Cascade").build();
        Trick shower = Trick.builder().id(2L).name("Douche").build();
        LearningPath path = LearningPath.builder().id(1L).pathName("Fondamentaux").build();

        LearningPathStep step1 = LearningPathStep.builder()
                .learningPath(path).trick(cascade).stepOrder(1).build();
        LearningPathStep step2 = LearningPathStep.builder()
                .learningPath(path).trick(shower).stepOrder(2).build();

        Map<Long, UserProgress> progress = Map.of(
                1L, UserProgress.builder()
                        .trick(cascade)
                        .status(UserProgress.ProgressStatus.MASTERED)
                        .attemptCount(8)
                        .build(),
                2L, UserProgress.builder()
                        .trick(shower)
                        .status(UserProgress.ProgressStatus.IN_PROGRESS)
                        .attemptCount(3)
                        .build()
        );

        var blockage = service.findBlockageOnPath(List.of(step1, step2), progress);

        assertTrue(blockage.isPresent());
        assertEquals("Douche", blockage.get().trickName());
        assertEquals(3, blockage.get().attemptCount());
    }
}
