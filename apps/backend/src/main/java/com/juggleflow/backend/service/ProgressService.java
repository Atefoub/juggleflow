package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.ProgressRequest;
import com.juggleflow.backend.dto.ProgressResponse;
import com.juggleflow.backend.dto.StatisticsResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.Trick;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.model.UserProgress.ProgressStatus;
import com.juggleflow.backend.repository.PracticeSessionRepository;
import com.juggleflow.backend.repository.TrickRepository;
import com.juggleflow.backend.repository.UserBadgeRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Europe/Paris");

    private final UserProgressRepository progressRepository;
    private final UserRepository userRepository;
    private final TrickRepository trickRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final BadgeService badgeService;
    private final StreakService streakService;
    private final PracticeSessionRepository practiceSessionRepository;

    /**
     * Récupère toute la progression d'un utilisateur.
     */
    @Transactional(readOnly = true)
    public List<ProgressResponse> getProgress(String email) {
        User user = findUserByEmail(email);
        return progressRepository.findByUser_Id(user.getId())
            .stream()
            .map(ProgressResponse::from)
            .toList();
    }

    /**
     * Crée ou met à jour la progression sur une figure.
     */
    @Transactional
    public ProgressResponse upsertProgress(String email, Long trickId,
                                            ProgressRequest request) {
        User user = findUserByEmail(email);
        Trick trick = trickRepository.findById(trickId)
            .orElseThrow(() -> new ResourceNotFoundException("Figure", trickId));

        UserProgress progress = progressRepository
            .findByUser_IdAndTrick_Id(user.getId(), trickId)
            .orElseGet(() -> UserProgress.builder()
                .user(user)
                .trick(trick)
                .startedAt(Instant.now())
                .build());

        progress.setStatus(request.getStatus());
        progress.setAttemptCount(progress.getAttemptCount() + 1);
        progress.setLastPractice(Instant.now());

        if (request.getMasteryPercentage() != null) {
            progress.setMasteryPercentage(request.getMasteryPercentage());
        }

        if (request.getStatus() == ProgressStatus.MASTERED
                && progress.getMasteredAt() == null) {
            progress.setMasteredAt(Instant.now());
        }

        UserProgress saved = progressRepository.save(progress);

        // Incremente le streak AVANT de verifier les badges : le badge
        // "Perseverant" doit pouvoir s'evaluer avec le streak du jour.
        streakService.recordPracticeDay(user.getId(), LocalDate.now(DEFAULT_ZONE));
        badgeService.checkAndUnlockBadges(user);

        return ProgressResponse.from(saved);
    }

    /**
     * Statistiques agrégées de l'utilisateur.
     */
    @Transactional(readOnly = true)
    public StatisticsResponse getStatistics(String email) {
        User user = findUserByEmail(email);

        long mastered = progressRepository.countMasteredByUserId(user.getId());
        long inProgress = progressRepository
            .findByUser_IdAndStatus(user.getId(), ProgressStatus.IN_PROGRESS)
            .size();
        long badges = userBadgeRepository.findByUser_IdOrderByUnlockedAtDesc(user.getId())
            .size();
        int currentStreak = streakService.getCurrentStreak(user.getId());
        int longestStreak = streakService.getLongestStreak(user.getId());
        long practiceMinutes =
            practiceSessionRepository.sumDurationSecondsByUserId(user.getId()) / 60L;

        return StatisticsResponse.builder()
            .totalTricksLearned(mastered)
            .tricksInProgress(inProgress)
            .badgesEarned(badges)
            .currentStreakDays(currentStreak)
            .longestStreakDays(longestStreak)
            .totalPracticeMinutes(practiceMinutes)
            .build();
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Utilisateur introuvable : " + email));
    }
}
