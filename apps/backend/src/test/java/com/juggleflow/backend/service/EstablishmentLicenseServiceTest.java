package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.model.EstablishmentSettings;
import com.juggleflow.backend.repository.EstablishmentSettingsRepository;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.support.EstablishmentSettingsTestFixtures;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class EstablishmentLicenseServiceTest {

    @Autowired private AuthService authService;
    @Autowired private EstablishmentLicenseService establishmentLicenseService;
    @Autowired private EstablishmentSettingsRepository establishmentSettingsRepository;
    @Autowired private UserRepository userRepository;

    private final List<String> createdEmails = new ArrayList<>();
    private long seatsUsedBeforeRace;

    @BeforeEach
    void setUp() {
        seatsUsedBeforeRace = establishmentLicenseService.countLicensedSeatsUsed();

        EstablishmentSettings settings = establishmentSettingsRepository.findById(1L).orElseThrow();
        settings.setLicenseSeatCap((int) seatsUsedBeforeRace + 1);
        establishmentSettingsRepository.save(settings);
    }

    @AfterEach
    void tearDown() {
        EstablishmentSettingsTestFixtures.resetToDefaults(establishmentSettingsRepository);
        createdEmails.forEach(email -> userRepository.findByEmail(email).ifPresent(userRepository::delete));
        createdEmails.clear();
    }

    @Test
    @DisplayName("Deux register() concurrents avec une seule place restante → une réussite, une CONFLICT")
    void concurrentRegister_lastSeat_onlyOneSucceeds() throws Exception {
        assertThat(establishmentLicenseService.countLicensedSeatsUsed()).isEqualTo(seatsUsedBeforeRace);

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger conflict = new AtomicInteger();

        String emailA = "license-race-a-" + System.nanoTime() + "@test.fr";
        String emailB = "license-race-b-" + System.nanoTime() + "@test.fr";
        createdEmails.add(emailA);
        createdEmails.add(emailB);

        try {
            Future<?> f1 = pool.submit(() -> attemptRegister(emailA, start, success, conflict));
            Future<?> f2 = pool.submit(() -> attemptRegister(emailB, start, success, conflict));
            start.countDown();

            f1.get(30, TimeUnit.SECONDS);
            f2.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        assertThat(success.get()).isEqualTo(1);
        assertThat(conflict.get()).isEqualTo(1);
        assertThat(establishmentLicenseService.countLicensedSeatsUsed())
            .isEqualTo(seatsUsedBeforeRace + 1);
    }

    private void attemptRegister(
            String email,
            CountDownLatch start,
            AtomicInteger success,
            AtomicInteger conflict) {
        try {
            start.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }

        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("Test2026!");
        request.setFirstName("Race");
        request.setLastName("Licence");
        request.setRole("student");

        try {
            authService.register(request);
            success.incrementAndGet();
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode() == HttpStatus.CONFLICT) {
                conflict.incrementAndGet();
            } else {
                throw ex;
            }
        }
    }
}
