package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AdminCreateUserRequest;
import com.juggleflow.backend.dto.AdminCreateUserResponse;
import com.juggleflow.backend.dto.AdminEstablishmentStatsResponse;
import com.juggleflow.backend.dto.AdminUserResponse;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.Administrator;
import com.juggleflow.backend.model.GdprConsent.ConsentStatus;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.model.EstablishmentSettings;
import com.juggleflow.backend.repository.AdministratorRepository;
import com.juggleflow.backend.repository.EstablishmentSettingsRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    /**
     * Alphabet pour la generation de mot de passe temporaire :
     * - 23 lettres minuscules / 23 majuscules (ambigus 'I' 'l' 'O' '0' retires)
     * - 10 chiffres
     * - 8 symboles "URL-safe" (pas de quote, espace, backslash)
     * Entropie effective : ~6.07 bits/char x 12 chars = ~73 bits, suffisant pour
     * un mot de passe a usage temporaire qui sera change a la 1re connexion.
     */
    private static final String PWD_ALPHABET =
        "abcdefghjkmnpqrstuvwxyz" +
        "ABCDEFGHJKMNPQRSTUVWXYZ" +
        "23456789" +
        "!@#$%&*+=?";

    private static final int GENERATED_PASSWORD_LENGTH = 14;

    private final UserRepository userRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final StudentRepository studentRepository;
    private final UserProgressRepository userProgressRepository;
    private final TeacherRepository teacherRepository;
    private final AdministratorRepository administratorRepository;
    private final EstablishmentSettingsRepository establishmentSettingsRepository;
    private final EstablishmentLicenseService establishmentLicenseService;
    private final GdprService gdprService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Agrégats établissement pour le tableau de bord admin.
     */
    public AdminEstablishmentStatsResponse getEstablishmentStats() {
        var settingsOpt = establishmentSettingsRepository.findById(1L);
        Integer seatCap = settingsOpt.map(EstablishmentSettings::getLicenseSeatCap).orElse(null);
        String expiresAt = settingsOpt
            .map(EstablishmentSettings::getLicenseExpiresAt)
            .map(LocalDate::toString)
            .orElse(null);

        return AdminEstablishmentStatsResponse.builder()
            .classCount(schoolClassRepository.count())
            .studentCount(studentRepository.count())
            .teacherAccountCount(teacherRepository.count())
            .administratorAccountCount(administratorRepository.count())
            .activeUserCount(userRepository.countByEnabledTrue())
            .licenseSeatCap(seatCap)
            .licenseUsedCount(establishmentLicenseService.countLicensedSeatsUsed())
            .licenseExpiresAt(expiresAt)
            .build();
    }

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
     * Cree un compte utilisateur (eleve, enseignant ou administrateur).
     *
     * Securite :
     *   - email unique (409 si deja pris).
     *   - role rabattu via la regex du DTO (pas d'injection possible).
     *   - mot de passe encode via {@code PasswordEncoder} (BCrypt 12 rounds).
     *   - mot de passe en clair renvoye UNE SEULE FOIS quand il a ete genere
     *     par le serveur ; jamais persiste ailleurs, jamais loggue.
     *
     * Convention metier :
     *   - {@code classId} / {@code schoolLevel} / {@code birthDate} ne sont
     *     appliques que pour les eleves. Pour un teacher/admin ils sont ignores.
     */
    @Transactional
    public AdminCreateUserResponse createUser(AdminCreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Un utilisateur avec cet email existe deja.");
        }

        if ("ROLE_ELEVE".equals(request.getRole()) || "ROLE_ENSEIGNANT".equals(request.getRole())) {
            establishmentLicenseService.assertSeatAvailableForNewAccount();
        }

        boolean generated = request.getPassword() == null || request.getPassword().isBlank();
        String rawPassword = generated ? generateTemporaryPassword() : request.getPassword();
        String encodedPassword = passwordEncoder.encode(rawPassword);

        User saved = switch (request.getRole()) {
            case "ROLE_ELEVE" -> userRepository.save(buildStudent(request, encodedPassword));
            case "ROLE_ENSEIGNANT" -> userRepository.save(buildTeacher(request, encodedPassword));
            case "ROLE_ADMINISTRATEUR" -> userRepository.save(buildAdmin(request, encodedPassword));
            // Cas defensif : la validation @Pattern aurait deja rejete.
            default -> throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Role invalide.");
        };

        Long classId = null;
        String className = null;
        if (saved instanceof Student student && student.getSchoolClass() != null) {
            classId = student.getSchoolClass().getId();
            className = student.getSchoolClass().getName();
        }

        return AdminCreateUserResponse.builder()
            .id(saved.getId())
            .email(saved.getEmail())
            .firstName(saved.getFirstName())
            .lastName(saved.getLastName())
            .role(saved.getRole())
            .enabled(saved.isEnabled())
            .classId(classId)
            .className(className)
            .generatedPassword(generated ? rawPassword : null)
            .build();
    }

    private Student buildStudent(AdminCreateUserRequest req, String encodedPassword) {
        SchoolClass schoolClass = null;
        if (req.getClassId() != null) {
            schoolClass = schoolClassRepository.findById(req.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Classe", req.getClassId()));
        }
        return Student.builder()
            .email(req.getEmail())
            .password(encodedPassword)
            .firstName(req.getFirstName())
            .lastName(req.getLastName())
            .enabled(true)
            .schoolClass(schoolClass)
            .schoolLevel(req.getSchoolLevel())
            .birthDate(req.getBirthDate())
            .enrollmentDate(LocalDate.now())
            .build();
    }

    private Teacher buildTeacher(AdminCreateUserRequest req, String encodedPassword) {
        return Teacher.builder()
            .email(req.getEmail())
            .password(encodedPassword)
            .firstName(req.getFirstName())
            .lastName(req.getLastName())
            .enabled(true)
            .certified(false)
            .build();
    }

    private Administrator buildAdmin(AdminCreateUserRequest req, String encodedPassword) {
        return Administrator.builder()
            .email(req.getEmail())
            .password(encodedPassword)
            .firstName(req.getFirstName())
            .lastName(req.getLastName())
            .enabled(true)
            .adminRole("school_admin")
            .build();
    }

    private String generateTemporaryPassword() {
        StringBuilder sb = new StringBuilder(GENERATED_PASSWORD_LENGTH);
        for (int i = 0; i < GENERATED_PASSWORD_LENGTH; i++) {
            sb.append(PWD_ALPHABET.charAt(secureRandom.nextInt(PWD_ALPHABET.length())));
        }
        return sb.toString();
    }

    /**
     * Active ou désactive un compte utilisateur (administration).
     * Interdit : se désactiver soi-même, désactiver le dernier administrateur actif.
     */
    @Transactional
    public void setUserEnabled(long targetUserId, boolean enabled, String actingAdminEmail) {
        User actor = userRepository.findByEmail(actingAdminEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Administrateur introuvable pour cette session."));

        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", targetUserId));

        if (!enabled) {
            if (target.getId().equals(actor.getId())) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Impossible de désactiver votre propre compte depuis l'administration.");
            }
            if (target instanceof Administrator) {
                long activeAdmins = userRepository.findAll().stream()
                    .filter(u -> u instanceof Administrator && u.isEnabled())
                    .count();
                if (activeAdmins <= 1) {
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Impossible de désactiver le dernier administrateur actif.");
                }
            }
        }

        target.setEnabled(enabled);
        userRepository.save(target);
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

            ConsentStatus status = gdprService.getParentalConsentStatus(student.getId());
            builder
                .classId(classId)
                .className(className)
                .parentalConsentStatus(switch (status) {
                    case VALID   -> "ok";
                    case EXPIRED -> "expired";
                    case REVOKED, MISSING -> "missing";
                });
        }

        return builder.build();
    }
}

