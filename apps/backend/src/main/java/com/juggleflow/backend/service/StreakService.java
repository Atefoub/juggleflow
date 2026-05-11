package com.juggleflow.backend.service;

import com.juggleflow.backend.model.UserStreak;
import com.juggleflow.backend.repository.UserStreakRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Gestion du compteur de jours consecutifs ("streak") par utilisateur.
 *
 * Regle metier :
 *   - meme jour qu'une pratique deja enregistree -> noop (idempotent)
 *   - jour J+1 par rapport a la derniere pratique -> +1 jour
 *   - sinon (trou, premiere fois) -> reset a 1
 *   - longest_streak_days conserve toujours le record historique
 *
 * On manipule un Long userId (et non une entite User) pour eviter les
 * "detached entity passed to persist" quand le service est appele
 * en-dehors d'une session JPA active (cas typique des tests unitaires).
 *
 * Appele depuis {@link ProgressService#upsertProgress} chaque fois qu'un
 * eleve marque une figure en cours/maitrisee. Le tracking de
 * {@code practice_session} (P2) pourra appeler ici a la fin de chaque
 * session chronometree.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StreakService {

    private final UserStreakRepository userStreakRepository;

    @Transactional
    public UserStreak recordPracticeDay(Long userId, LocalDate practiceDate) {
        UserStreak streak = userStreakRepository.findByUserId(userId)
            .orElseGet(() -> UserStreak.builder()
                .userId(userId)
                .currentStreakDays(0)
                .longestStreakDays(0)
                .build());

        LocalDate last = streak.getLastPracticeDate();
        int next;
        if (last == null) {
            next = 1;
        } else if (last.equals(practiceDate)) {
            return streak;
        } else if (last.plusDays(1).equals(practiceDate)) {
            next = streak.getCurrentStreakDays() + 1;
        } else if (last.isAfter(practiceDate)) {
            // Cas defensif : date passee deja enregistree, on ne regresse pas.
            return streak;
        } else {
            next = 1;
        }

        streak.setCurrentStreakDays(next);
        streak.setLastPracticeDate(practiceDate);
        if (next > streak.getLongestStreakDays()) {
            streak.setLongestStreakDays(next);
        }

        UserStreak saved = userStreakRepository.save(streak);
        log.debug("Streak utilisateur {} : current={} longest={}",
            userId, saved.getCurrentStreakDays(), saved.getLongestStreakDays());
        return saved;
    }

    @Transactional(readOnly = true)
    public int getCurrentStreak(Long userId) {
        return userStreakRepository.findByUserId(userId)
            .map(UserStreak::getCurrentStreakDays)
            .orElse(0);
    }

    @Transactional(readOnly = true)
    public int getLongestStreak(Long userId) {
        return userStreakRepository.findByUserId(userId)
            .map(UserStreak::getLongestStreakDays)
            .orElse(0);
    }
}
