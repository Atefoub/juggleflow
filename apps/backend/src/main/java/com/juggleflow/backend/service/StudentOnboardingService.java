package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.StudentOnboardingRequest;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StudentOnboardingService {

    private static final Set<String> ALLOWED_LEVELS = Set.of(
        "BEGINNER", "INTERMEDIATE", "ADVANCED"
    );

    private final StudentRepository studentRepository;

    @Transactional
    public Student completeOnboarding(String email, StudentOnboardingRequest request) {
        Student student = studentRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Élève introuvable pour : " + email));

        String level = request.getLevel().trim().toUpperCase();
        if (!ALLOWED_LEVELS.contains(level)) {
            throw new IllegalArgumentException("Niveau invalide : " + level);
        }

        student.setJugglingLevel(level);
        student.setOnboardingCompletedAt(Instant.now());
        return studentRepository.save(student);
    }

    @Transactional
    public Student updateLevel(String email, String level) {
        Student student = studentRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Élève introuvable pour : " + email));

        String normalized = level.trim().toUpperCase();
        if (!ALLOWED_LEVELS.contains(normalized)) {
            throw new IllegalArgumentException("Niveau invalide : " + normalized);
        }

        student.setJugglingLevel(normalized);
        if (student.getOnboardingCompletedAt() == null) {
            student.setOnboardingCompletedAt(Instant.now());
        }
        return studentRepository.save(student);
    }
}
