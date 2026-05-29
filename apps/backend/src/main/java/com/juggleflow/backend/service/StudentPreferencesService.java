package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.StudentPreferencesResponse;
import com.juggleflow.backend.dto.UpdateStudentPreferencesRequest;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudentPreferencesService {

    private final StudentRepository studentRepository;

    @Transactional(readOnly = true)
    public StudentPreferencesResponse getPreferences(String studentEmail) {
        Student student = findStudent(studentEmail);
        return StudentPreferencesResponse.builder()
            .practiceRemindersEnabled(student.isPracticeRemindersEnabled())
            .darkModeEnabled(student.isDarkModeEnabled())
            .build();
    }

    @Transactional
    public StudentPreferencesResponse updatePreferences(
        String studentEmail,
        UpdateStudentPreferencesRequest request) {
        Student student = findStudent(studentEmail);
        if (request.getPracticeRemindersEnabled() != null) {
            student.setPracticeRemindersEnabled(request.getPracticeRemindersEnabled());
        }
        if (request.getDarkModeEnabled() != null) {
            student.setDarkModeEnabled(request.getDarkModeEnabled());
        }
        studentRepository.save(student);
        return getPreferences(studentEmail);
    }

    private Student findStudent(String email) {
        return studentRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Élève introuvable pour cette session."));
    }
}
