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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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

        // Optimisation : un seul fetch des élèves + une seule requête d'agrégats
        List<Student> students = studentRepository.findStudentsForProgressExport(schoolYear);
        if (students.isEmpty()) {
            return header + "\n";
        }

        List<Long> studentIds = students.stream().map(Student::getId).toList();
        Map<Long, UserProgressRepository.ProgressAggregateRow> aggByStudentId =
            userProgressRepository.aggregateProgressByUserIds(studentIds)
                .stream()
                .collect(Collectors.toMap(
                    UserProgressRepository.ProgressAggregateRow::getUserId,
                    r -> r
                ));

        // Grouping par classe (préserve l'info classId/className sans nouvelles requêtes)
        Map<Long, List<Student>> byClassId = students.stream()
            .collect(Collectors.groupingBy(s -> s.getSchoolClass().getId()));

        // Classes triées par nom pour stabilité du CSV
        List<com.juggleflow.backend.model.SchoolClass> sortedClasses = byClassId.values().stream()
            .map(list -> list.get(0).getSchoolClass())
            .sorted(Comparator.comparing(com.juggleflow.backend.model.SchoolClass::getName))
            .toList();

        String body = sortedClasses.stream()
            .flatMap(sc -> {
                List<Student> classStudents = byClassId.getOrDefault(sc.getId(), List.of());
                return classStudents.stream()
                    .sorted(Comparator.comparing(Student::getLastName).thenComparing(Student::getFirstName))
                    .map(student -> {
                        UserProgressRepository.ProgressAggregateRow agg = aggByStudentId.get(student.getId());

                        long totalTricks = agg != null ? agg.getTotalTricks() : 0;
                        long mastered = agg != null ? agg.getMasteredTricks() : 0;
                        long inProgress = agg != null ? agg.getInProgressTricks() : 0;
                        int percent = totalTricks == 0 ? 0 : (int) ((mastered * 100L) / totalTricks);
                        Instant lastPracticeAt = agg != null ? agg.getLastPracticeAt() : null;

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
                    });
            })
            .collect(Collectors.joining("\n"));

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

