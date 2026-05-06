package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AdminUserResponse;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.model.GdprConsent;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final GdprConsentRepository gdprConsentRepository;

    public List<SchoolClassResponse> getAllClasses() {
        return schoolClassRepository.findAll()
            .stream()
            .map(SchoolClassResponse::from)
            .toList();
    }

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAll()
            .stream()
            .map(this::toAdminUserResponse)
            .toList();
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        AdminUserResponse.AdminUserResponseBuilder builder = AdminUserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .enabled(user.isEnabled())
            .parentalConsentStatus("none");

        if (user instanceof Student student) {
            Long classId = student.getSchoolClass() != null ? student.getSchoolClass().getId() : null;
            String className = student.getSchoolClass() != null ? student.getSchoolClass().getName() : null;

            Optional<GdprConsent> consent = gdprConsentRepository.findByUser_IdAndConsentType(
                student.getId(), GdprConsent.ConsentType.PARENTAL_MINOR);
            boolean ok = consent.map(GdprConsent::isConsentGiven).orElse(false);

            builder
                .classId(classId)
                .className(className)
                .parentalConsentStatus(ok ? "ok" : "missing");
        }

        return builder.build();
    }
}

