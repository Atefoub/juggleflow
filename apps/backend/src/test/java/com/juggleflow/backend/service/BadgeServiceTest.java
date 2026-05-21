package com.juggleflow.backend.service;

import com.juggleflow.backend.model.PracticeSession;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.model.UserStreak;
import com.juggleflow.backend.repository.PracticeSessionRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.UserBadgeRepository;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.repository.UserStreakRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie que BadgeService.checkAndUnlockBadges debloque correctement
 * les badges "Persévérant" (consecutive_days) et "Marathonien" (practice_time)
 * (libellés FR depuis V17).
 *
 * Ces deux badges existaient deja en base mais ne se debloquaient jamais
 * avant l'extension du switch dans isBadgeEarned.
 *
 * {@code @Transactional} + {@code @Rollback} : on garde la session
 * ouverte durant les assertions (qui naviguent {@code badge.getName()}
 * via une relation LAZY) et la base est nettoyee en fin de test.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Rollback
class BadgeServiceTest {

    private static final String BADGE_PERSEVERANT = "Persévérant";
    private static final String BADGE_MARATHON = "Marathonien";

    @Autowired private BadgeService badgeService;
    @Autowired private UserBadgeRepository userBadgeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private UserStreakRepository userStreakRepository;
    @Autowired private PracticeSessionRepository practiceSessionRepository;

    private User user;

    @BeforeEach
    void setUp() {
        user = studentRepository.save(Student.builder()
            .email("badges@test.fr")
            .password("hashed")
            .firstName("Badge")
            .lastName("Test")
            .enabled(true)
            .build());
    }

    @Test
    @DisplayName("Aucun streak ni session : aucun badge ne se debloque")
    void noStreakNoSessions_unlocksNoBadge() {
        badgeService.checkAndUnlockBadges(user);

        assertThat(userBadgeRepository.findByUser_IdOrderByUnlockedAtDesc(user.getId()))
            .isEmpty();
    }

    @Test
    @DisplayName("Streak >= 7 jours : badge 'Persévérant' debloque")
    void streakOf7_unlocksPerseverantBadge() {
        userStreakRepository.save(UserStreak.builder()
            .userId(user.getId())
            .currentStreakDays(7)
            .longestStreakDays(7)
            .lastPracticeDate(LocalDate.now())
            .build());

        badgeService.checkAndUnlockBadges(user);

        boolean perseverantUnlocked = userBadgeRepository
            .findByUser_IdOrderByUnlockedAtDesc(user.getId())
            .stream()
            .anyMatch(ub -> BADGE_PERSEVERANT.equalsIgnoreCase(ub.getBadge().getName()));
        assertThat(perseverantUnlocked).isTrue();
    }

    @Test
    @DisplayName("Streak < 7 jours : badge 'Persévérant' NON debloque")
    void streakBelow7_doesNotUnlockPerseverant() {
        userStreakRepository.save(UserStreak.builder()
            .userId(user.getId())
            .currentStreakDays(6)
            .longestStreakDays(6)
            .lastPracticeDate(LocalDate.now())
            .build());

        badgeService.checkAndUnlockBadges(user);

        boolean perseverantUnlocked = userBadgeRepository
            .findByUser_IdOrderByUnlockedAtDesc(user.getId())
            .stream()
            .anyMatch(ub -> BADGE_PERSEVERANT.equalsIgnoreCase(ub.getBadge().getName()));
        assertThat(perseverantUnlocked).isFalse();
    }

    @Test
    @DisplayName("Practice time >= 6000 minutes : badge 'Marathonien' debloque")
    void practiceTimeOf100Hours_unlocksMarathonBadge() {
        // 6000 minutes = 360_000 secondes
        practiceSessionRepository.save(PracticeSession.builder()
            .user(user)
            .startedAt(Instant.now().minusSeconds(360_000))
            .endedAt(Instant.now())
            .durationSeconds(360_000)
            .source("test")
            .build());

        badgeService.checkAndUnlockBadges(user);

        boolean marathonUnlocked = userBadgeRepository
            .findByUser_IdOrderByUnlockedAtDesc(user.getId())
            .stream()
            .anyMatch(ub -> BADGE_MARATHON.equalsIgnoreCase(ub.getBadge().getName()));
        assertThat(marathonUnlocked).isTrue();
    }

    @Test
    @DisplayName("Practice time legerement insuffisant : badge 'Marathonien' NON debloque")
    void practiceTimeBelowThreshold_doesNotUnlockMarathon() {
        // 5999 minutes < 6000 minutes seuil
        practiceSessionRepository.save(PracticeSession.builder()
            .user(user)
            .startedAt(Instant.now().minusSeconds(359_940))
            .endedAt(Instant.now())
            .durationSeconds(359_940)
            .source("test")
            .build());

        badgeService.checkAndUnlockBadges(user);

        boolean marathonUnlocked = userBadgeRepository
            .findByUser_IdOrderByUnlockedAtDesc(user.getId())
            .stream()
            .anyMatch(ub -> BADGE_MARATHON.equalsIgnoreCase(ub.getBadge().getName()));
        assertThat(marathonUnlocked).isFalse();
    }

    @Test
    @DisplayName("Streak suffisant ET practice_time suffisant : les deux badges debloques")
    void bothConditionsMet_unlocksBothBadges() {
        userStreakRepository.save(UserStreak.builder()
            .userId(user.getId())
            .currentStreakDays(7)
            .longestStreakDays(7)
            .lastPracticeDate(LocalDate.now())
            .build());

        practiceSessionRepository.save(PracticeSession.builder()
            .user(user)
            .startedAt(Instant.now().minusSeconds(360_000))
            .endedAt(Instant.now())
            .durationSeconds(360_000)
            .source("test")
            .build());

        badgeService.checkAndUnlockBadges(user);

        var unlocked = userBadgeRepository.findByUser_IdOrderByUnlockedAtDesc(user.getId())
            .stream()
            .map(ub -> ub.getBadge().getName())
            .toList();

        assertThat(unlocked).contains(BADGE_PERSEVERANT, BADGE_MARATHON);
    }

    @Test
    @DisplayName("Re-execution : pas de duplication des UserBadge")
    void runningTwice_doesNotDuplicateUnlocks() {
        userStreakRepository.save(UserStreak.builder()
            .userId(user.getId())
            .currentStreakDays(7)
            .longestStreakDays(7)
            .lastPracticeDate(LocalDate.now())
            .build());

        badgeService.checkAndUnlockBadges(user);
        badgeService.checkAndUnlockBadges(user);

        long perseverantCount = userBadgeRepository
            .findByUser_IdOrderByUnlockedAtDesc(user.getId())
            .stream()
            .filter(ub -> BADGE_PERSEVERANT.equalsIgnoreCase(ub.getBadge().getName()))
            .count();
        assertThat(perseverantCount).isEqualTo(1L);
    }
}
