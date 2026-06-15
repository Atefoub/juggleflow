package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.ProgressRequest;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Trick;
import com.juggleflow.backend.model.UserProgress.ProgressStatus;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TrickRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class ProgressServiceTest {

    @Autowired private ProgressService progressService;
    @Autowired private StudentRepository studentRepository;
    @Autowired private TrickRepository trickRepository;
    @Autowired private UserProgressRepository userProgressRepository;

    private Student student;
    private Long trickId;
    private final ProgressRequest request = new ProgressRequest();

    @BeforeEach
    void setUp() {
        request.setStatus(ProgressStatus.IN_PROGRESS);
        request.setMasteryPercentage(25);

        student = studentRepository.save(Student.builder()
            .email("progress-race-" + System.nanoTime() + "@test.fr")
            .password("hashed")
            .firstName("Race")
            .lastName("Test")
            .enabled(true)
            .build());

        trickId = trickRepository.findAll().stream()
            .findFirst()
            .map(Trick::getId)
            .orElseThrow(() -> new IllegalStateException("Aucune figure en base de test"));
    }

    @Test
    @DisplayName("Deux upsertProgress concurrents sur le même (user, trick) → une seule ligne, pas d'exception")
    void concurrentUpsert_sameUserAndTrick_succeedsWithSingleRow() throws Exception {
        String email = student.getEmail();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            Future<?> f1 = pool.submit(() -> runUpsert(email, start));
            Future<?> f2 = pool.submit(() -> runUpsert(email, start));
            start.countDown();

            f1.get(30, TimeUnit.SECONDS);
            f2.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        assertThat(userProgressRepository.findByUser_IdAndTrick_Id(student.getId(), trickId))
            .isPresent();
        assertThat(userProgressRepository.findByUser_Id(student.getId()))
            .hasSize(1);
    }

    private void runUpsert(String email, CountDownLatch start) {
        try {
            start.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
        progressService.upsertProgress(email, trickId, request);
    }
}
