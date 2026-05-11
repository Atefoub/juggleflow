package com.juggleflow.backend.service;

import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.model.UserStreak;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.repository.UserStreakRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class StreakServiceTest {

    @Autowired private StreakService streakService;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private UserStreakRepository userStreakRepository;

    private User user;

    @BeforeEach
    void setUp() {
        userStreakRepository.deleteAll();
        studentRepository.deleteAll();
        userRepository.deleteAll();

        user = studentRepository.save(Student.builder()
            .email("streak@test.fr")
            .password("hashed")
            .firstName("Streak")
            .lastName("Test")
            .enabled(true)
            .build());
    }

    @Test
    @DisplayName("Premiere pratique : current=1, longest=1, lastDate fixee")
    void firstPractice_setsStreakToOne() {
        LocalDate day = LocalDate.of(2026, 5, 11);

        UserStreak result = streakService.recordPracticeDay(user.getId(), day);

        assertThat(result.getCurrentStreakDays()).isEqualTo(1);
        assertThat(result.getLongestStreakDays()).isEqualTo(1);
        assertThat(result.getLastPracticeDate()).isEqualTo(day);
    }

    @Test
    @DisplayName("Deux pratiques le meme jour : streak reste a 1 (idempotent)")
    void samePracticeDay_isIdempotent() {
        LocalDate day = LocalDate.of(2026, 5, 11);

        streakService.recordPracticeDay(user.getId(), day);
        UserStreak result = streakService.recordPracticeDay(user.getId(), day);

        assertThat(result.getCurrentStreakDays()).isEqualTo(1);
        assertThat(result.getLongestStreakDays()).isEqualTo(1);
    }

    @Test
    @DisplayName("Jour suivant : current incremente, longest suit")
    void consecutiveDay_incrementsStreak() {
        LocalDate d1 = LocalDate.of(2026, 5, 11);

        streakService.recordPracticeDay(user.getId(), d1);
        streakService.recordPracticeDay(user.getId(), d1.plusDays(1));
        UserStreak result = streakService.recordPracticeDay(user.getId(), d1.plusDays(2));

        assertThat(result.getCurrentStreakDays()).isEqualTo(3);
        assertThat(result.getLongestStreakDays()).isEqualTo(3);
    }

    @Test
    @DisplayName("Trou d'un jour : current revient a 1, longest conserve")
    void gapInPractice_resetsCurrentKeepsLongest() {
        LocalDate d1 = LocalDate.of(2026, 5, 11);

        streakService.recordPracticeDay(user.getId(), d1);
        streakService.recordPracticeDay(user.getId(), d1.plusDays(1));
        streakService.recordPracticeDay(user.getId(), d1.plusDays(2));
        // 4 jours plus tard => trou
        UserStreak result = streakService.recordPracticeDay(user.getId(), d1.plusDays(6));

        assertThat(result.getCurrentStreakDays()).isEqualTo(1);
        assertThat(result.getLongestStreakDays()).isEqualTo(3);
        assertThat(result.getLastPracticeDate()).isEqualTo(d1.plusDays(6));
    }

    @Test
    @DisplayName("Date passee deja enregistree : pas de regression")
    void pastDate_doesNotRegressStreak() {
        LocalDate d1 = LocalDate.of(2026, 5, 11);

        streakService.recordPracticeDay(user.getId(), d1);
        streakService.recordPracticeDay(user.getId(), d1.plusDays(1));
        // Tentative d'enregistrer une pratique anterieure : ignoree
        UserStreak result = streakService.recordPracticeDay(user.getId(), d1.minusDays(5));

        assertThat(result.getCurrentStreakDays()).isEqualTo(2);
        assertThat(result.getLastPracticeDate()).isEqualTo(d1.plusDays(1));
    }

    @Test
    @DisplayName("getCurrentStreak retourne 0 si aucune entree")
    void getCurrentStreak_returnsZero_whenNoEntry() {
        assertThat(streakService.getCurrentStreak(user.getId())).isZero();
        assertThat(streakService.getLongestStreak(user.getId())).isZero();
    }
}
