package com.juggleflow.backend.service;

import com.juggleflow.backend.model.GdprConsent;
import com.juggleflow.backend.model.GdprConsent.ConsentStatus;
import com.juggleflow.backend.model.GdprConsent.ConsentType;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@TestPropertySource(properties = "gdpr.enforce-parental-consent-on-auth=true")
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GdprServiceStudentAccessTest {

    @Autowired private GdprService gdprService;
    @Autowired private UserRepository userRepository;
    @Autowired private GdprConsentRepository gdprConsentRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Student student;

    @BeforeEach
    void setUp() {
        gdprConsentRepository.deleteAll();
        userRepository.deleteAll();

        student = userRepository.save(Student.builder()
            .email("eleve@test.fr")
            .password(passwordEncoder.encode("Test2026!"))
            .firstName("Lucas")
            .lastName("Martin")
            .enabled(true)
            .build());
    }

    @Test
    @DisplayName("assertStudentMayAuthenticate → OK si consentement parental valide")
    void assertStudentMayAuthenticate_allowsValidConsent() {
        grantValidParentalConsent(student);

        gdprService.assertStudentMayAuthenticate(student);

        assertThat(student.isEnabled()).isTrue();
    }

    @Test
    @DisplayName("assertStudentMayAuthenticate → bloque et désactive si consentement manquant")
    void assertStudentMayAuthenticate_blocksMissingConsent() {
        assertThatThrownBy(() -> gdprService.assertStudentMayAuthenticate(student))
            .isInstanceOf(DisabledException.class)
            .hasMessageContaining("Consentement parental requis");

        assertThat(userRepository.findById(student.getId()).orElseThrow().isEnabled()).isFalse();
    }

    @Test
    @DisplayName("recordConsent → réactive un élève désactivé")
    void recordConsent_reenablesStudentWhenValid() {
        student.setEnabled(false);
        userRepository.save(student);

        Teacher guardian = userRepository.save(Teacher.builder()
            .email("parent@test.fr")
            .password(passwordEncoder.encode("Test2026!"))
            .firstName("Parent")
            .lastName("Test")
            .enabled(true)
            .certified(true)
            .build());

        var request = new com.juggleflow.backend.dto.ConsentRequest();
        request.setUserId(student.getId());
        request.setConsentType(ConsentType.PARENTAL_MINOR);
        request.setConsentGiven(true);
        request.setPolicyVersion("2026-1");
        request.setLegalGuardianId(guardian.getId());

        gdprService.recordConsent(request, "127.0.0.1");

        assertThat(userRepository.findById(student.getId()).orElseThrow().isEnabled()).isTrue();
        assertThat(gdprService.getParentalConsentStatus(student.getId()))
            .isEqualTo(ConsentStatus.VALID);
    }

    @Test
    @DisplayName("isStudentAuthenticationAllowed → ignore les enseignants")
    void isStudentAuthenticationAllowed_ignoresTeachers() {
        Teacher teacher = userRepository.save(Teacher.builder()
            .email("prof@test.fr")
            .password(passwordEncoder.encode("Test2026!"))
            .firstName("Marie")
            .lastName("Dupont")
            .enabled(true)
            .certified(true)
            .build());

        assertThat(gdprService.isStudentAuthenticationAllowed(teacher)).isTrue();
    }

    private void grantValidParentalConsent(Student target) {
        gdprConsentRepository.save(GdprConsent.builder()
            .user(target)
            .consentType(ConsentType.PARENTAL_MINOR)
            .consentGiven(true)
            .policyVersion("2026-1")
            .expiresAt(Instant.now().plus(400, ChronoUnit.DAYS))
            .build());
    }
}
