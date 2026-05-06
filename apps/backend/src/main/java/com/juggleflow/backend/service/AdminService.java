package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AdminUserResponse;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.model.GdprConsent;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final GdprConsentRepository gdprConsentRepository;
    private final StudentRepository studentRepository;
    private final UserProgressRepository userProgressRepository;

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

    /**
     * Export CSV : bilan de progression des élèves par classe (année scolaire optionnelle).
     *
     * Format (colonnes) :
     *   classId,className,schoolLevel,schoolYear,studentId,firstName,lastName,
     *   totalTricks,masteredTricks,inProgressTricks,completionPercent,lastPracticeAt
     */
    public String exportProgressCsv(Integer schoolYear) {
        String header = String.join(",",
            "classId",
            "className",
            "schoolLevel",
            "schoolYear",
            "studentId",
            "firstName",
            "lastName",
            "totalTricks",
            "masteredTricks",
            "inProgressTricks",
            "completionPercent",
            "lastPracticeAt"
        );

        List<com.juggleflow.backend.model.SchoolClass> classes = schoolClassRepository.findAll();
        String body = classes.stream()
            .filter(sc -> schoolYear == null || sc.getSchoolYear() == schoolYear)
            .flatMap(sc -> studentRepository.findBySchoolClass_Id(sc.getId()).stream().map(student -> {
                var progressList = userProgressRepository.findByUser_Id(student.getId());

                int totalTricks = progressList.size();
                long mastered = userProgressRepository.countMasteredByUserId(student.getId());
                long inProgress = userProgressRepository
                    .findByUser_IdAndStatus(student.getId(),
                        com.juggleflow.backend.model.UserProgress.ProgressStatus.IN_PROGRESS)
                    .size();

                int percent = totalTricks == 0 ? 0 : (int) ((mastered * 100L) / totalTricks);

                Instant lastPracticeAt = progressList.stream()
                    .map(com.juggleflow.backend.model.UserProgress::getLastPractice)
                    .filter(java.util.Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);

                return String.join(",",
                    String.valueOf(sc.getId()),
                    csvEscape(sc.getName()),
                    csvEscape(sc.getSchoolLevel()),
                    String.valueOf(sc.getSchoolYear()),
                    String.valueOf(student.getId()),
                    csvEscape(student.getFirstName()),
                    csvEscape(student.getLastName()),
                    String.valueOf(totalTricks),
                    String.valueOf(mastered),
                    String.valueOf(inProgress),
                    String.valueOf(percent),
                    csvEscape(lastPracticeAt != null ? lastPracticeAt.toString() : "")
                );
            }))
            .reduce((a, b) -> a + "\n" + b)
            .orElse("");

        if (body.isBlank()) {
            return header + "\n";
        }
        return header + "\n" + body + "\n";
    }

    private String csvEscape(String value) {
        if (value == null) return "\"\"";
        String v = value.replace("\"", "\"\"");
        return "\"" + v + "\"";
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

