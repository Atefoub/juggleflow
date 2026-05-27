package com.juggleflow.backend.bootstrap;

import com.juggleflow.backend.model.ClassLearningPath;
import com.juggleflow.backend.model.GdprConsent;
import com.juggleflow.backend.model.LearningPath;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.model.Trick;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.LearningPathRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.TrickRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.service.EstablishmentLicenseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Jeu de données de démonstration (dev / tests) : enseignants, classes, élèves,
 * parcours assignés et progressions variées (dont élève bloqué sur la Douche).
 *
 * Actif si {@code demo.bootstrap.enabled=true} et {@code demo.bootstrap.password} est défini.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "demo.bootstrap", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoBootstrapRunner implements ApplicationRunner {

    private static final String MARKER_EMAIL = "marie.dupont@ecole.fr";
    private static final Pattern PASSWORD_COMPLEXITY =
            Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SchoolClassRepository schoolClassRepository;
    private final ClassLearningPathRepository classLearningPathRepository;
    private final LearningPathRepository learningPathRepository;
    private final TrickRepository trickRepository;
    private final UserProgressRepository userProgressRepository;
    private final GdprConsentRepository gdprConsentRepository;
    private final EstablishmentLicenseService establishmentLicenseService;

    @Value("${demo.bootstrap.password:}")
    private String demoPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (demoPassword.isBlank()) {
            log.warn("DemoBootstrap : activé mais demo.bootstrap.password vide — ignoré");
            return;
        }
        if (demoPassword.length() < 8 || !PASSWORD_COMPLEXITY.matcher(demoPassword).matches()) {
            log.error("DemoBootstrap : mot de passe non conforme (8+ chars, minuscule, majuscule, chiffre)");
            return;
        }
        if (userRepository.existsByEmail(MARKER_EMAIL)) {
            log.info("DemoBootstrap : données déjà présentes ({}), aucune action", MARKER_EMAIL);
            return;
        }

        String encoded = passwordEncoder.encode(demoPassword);
        int schoolYear = LocalDate.now().getYear();
        Trick cascade = requireTrick("Cascade (3 balles)");
        Trick shower = requireTrick("Fontaine");
        Trick halfShower = requireTrick("Demi-fontaine");

        Teacher marie = saveTeacher(encoded, "marie.dupont@ecole.fr", "Marie", "Dupont");
        SchoolClass ce1 = saveClass("CE1 — Mme Dupont", "CE1", schoolYear, marie);
        assignPath(ce1, "Fondamentaux — 3 balles");
        int n1 = seedStudents(encoded, ce1, List.of(
                new DemoStudent("lucas.martin@ecole.fr", "Lucas", "Martin", "CE1", "BEGINNER",
                        List.of(mastered(cascade), inProgress(shower, 3, 15)), null),
                new DemoStudent("emma.rousseau@ecole.fr", "Emma", "Rousseau", "CE1", "BEGINNER",
                        List.of(mastered(cascade), mastered(shower)), "VERT"),
                new DemoStudent("noah.lambert@ecole.fr", "Noah", "Lambert", "CE1", "BEGINNER",
                        List.of(mastered(cascade), mastered(shower)), "VERT"),
                new DemoStudent("tom.bernard@ecole.fr", "Tom", "Bernard", "CE1", "INTERMEDIATE",
                        List.of(mastered(cascade), inProgress(shower, 2, 40)), "ORANGE"),
                new DemoStudent("malik.traore@ecole.fr", "Malik", "Traoré", "CE1", "BEGINNER",
                        List.of(inProgress(cascade, 2, 10)), "ROUGE"),
                new DemoStudent("chloe.vidal@ecole.fr", "Chloé", "Vidal", "CE1", "BEGINNER",
                        List.of(inProgress(cascade, 1, 5)), "ROUGE")
        ));
        ce1.setStudentCount(n1);
        schoolClassRepository.save(ce1);

        Teacher pierre = saveTeacher(encoded, "pierre.lefebvre@ecole.fr", "Pierre", "Lefebvre");
        SchoolClass cm2 = saveClass("CM2 — M. Lefebvre", "CM2", schoolYear, pierre);
        assignPath(cm2, "Figures avancées — Cycle 3");
        int n2 = seedStudents(encoded, cm2, List.of(
                new DemoStudent("ines.morel@ecole.fr", "Inès", "Morel", "CM2", "INTERMEDIATE",
                        List.of(mastered(cascade), mastered(shower), mastered(halfShower)), "VERT"),
                new DemoStudent("hugo.girard@ecole.fr", "Hugo", "Girard", "CM2", "INTERMEDIATE",
                        List.of(mastered(cascade), mastered(shower), inProgress(halfShower, 2, 35)), "ORANGE"),
                new DemoStudent("lea.fontaine@ecole.fr", "Léa", "Fontaine", "CM2", "EXPERT",
                        List.of(mastered(cascade), inProgress(shower, 3, 20)), "ORANGE"),
                new DemoStudent("adam.diallo@ecole.fr", "Adam", "Diallo", "CM2", "INTERMEDIATE",
                        List.of(mastered(cascade), inProgress(shower, 1, 8)), "ROUGE"),
                new DemoStudent("julia.petit@ecole.fr", "Julia", "Petit", "CM2", "BEGINNER",
                        List.of(inProgress(cascade, 1, 12)), "ROUGE")
        ));
        cm2.setStudentCount(n2);
        schoolClassRepository.save(cm2);

        Teacher sophie = saveTeacher(encoded, "sophie.renard@ecole.fr", "Sophie", "Renard");
        SchoolClass cp = saveClass("CP — Mme Renard", "CP", schoolYear, sophie);
        assignPath(cp, "Foulards — Initiation");
        int n3 = seedStudents(encoded, cp, List.of(
                new DemoStudent("nina.blanc@ecole.fr", "Nina", "Blanc", "CP", "BEGINNER",
                        List.of(inProgress(cascade, 1, 20)), null),
                new DemoStudent("theo.marchand@ecole.fr", "Théo", "Marchand", "CP", "BEGINNER",
                        List.of(), null),
                new DemoStudent("zoe.caron@ecole.fr", "Zoé", "Caron", "CP", "BEGINNER",
                        List.of(inProgress(cascade, 2, 45)), "VERT")
        ));
        cp.setStudentCount(n3);
        schoolClassRepository.save(cp);

        log.warn("""
                DemoBootstrap : comptes de test créés (mot de passe = DEMO_BOOTSTRAP_PASSWORD)
                  Enseignants : marie.dupont@ecole.fr | pierre.lefebvre@ecole.fr | sophie.renard@ecole.fr
                  Élèves       : *@ecole.fr ({} au total)
                  Classes      : CE1 (6 élèves, Lucas bloqué sur Fontaine), CM2 (5), CP (3)
                  Admin option : ADMIN_BOOTSTRAP_EMAIL dans .env
                NE PAS ACTIVER EN PRODUCTION
                """);
    }

    private Teacher saveTeacher(String encoded, String email, String firstName, String lastName) {
        Teacher teacher = Teacher.builder()
                .email(email)
                .password(encoded)
                .firstName(firstName)
                .lastName(lastName)
                .enabled(true)
                .certified(true)
                .build();
        return (Teacher) userRepository.save(teacher);
    }

    private SchoolClass saveClass(String name, String level, int schoolYear, Teacher teacher) {
        return schoolClassRepository.save(SchoolClass.builder()
                .name(name)
                .schoolLevel(level)
                .schoolYear(schoolYear)
                .studentCount(0)
                .homeroomTeacher(teacher)
                .build());
    }

    private void assignPath(SchoolClass schoolClass, String pathName) {
        LearningPath path = learningPathRepository.findAll().stream()
                .filter(p -> pathName.equals(p.getPathName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Parcours introuvable : " + pathName));

        if (classLearningPathRepository
                .findByLearningPath_IdAndSchoolClass_Id(path.getId(), schoolClass.getId())
                .isEmpty()) {
            classLearningPathRepository.save(ClassLearningPath.builder()
                    .learningPath(path)
                    .schoolClass(schoolClass)
                    .startDate(LocalDate.now().minusMonths(2))
                    .expectedEndDate(LocalDate.now().plusMonths(4))
                    .build());
        }
    }

    private int seedStudents(String encoded, SchoolClass schoolClass, List<DemoStudent> roster) {
        int count = 0;
        for (DemoStudent spec : roster) {
            establishmentLicenseService.assertSeatAvailableForNewAccount();
            Student student = Student.builder()
                    .email(spec.email())
                    .password(encoded)
                    .firstName(spec.firstName())
                    .lastName(spec.lastName())
                    .enabled(true)
                    .schoolClass(schoolClass)
                    .schoolLevel(spec.schoolLevel())
                    .enrollmentDate(LocalDate.now().minusMonths(2))
                    .jugglingLevel(spec.jugglingLevel())
                    .onboardingCompletedAt(Instant.now().minus(60, ChronoUnit.DAYS))
                    .assignedGroupColor(spec.assignedGroup())
                    .build();
            student = (Student) userRepository.save(student);
            grantParentalConsent(student);
            for (ProgressSeed seed : spec.progress()) {
                userProgressRepository.save(UserProgress.builder()
                        .user(student)
                        .trick(seed.trick())
                        .status(seed.status())
                        .attemptCount(seed.attempts())
                        .masteryPercentage(seed.mastery())
                        .startedAt(Instant.now().minus(14, ChronoUnit.DAYS))
                        .lastPractice(Instant.now().minus(1, ChronoUnit.DAYS))
                        .masteredAt(seed.status() == UserProgress.ProgressStatus.MASTERED
                                ? Instant.now().minus(2, ChronoUnit.DAYS) : null)
                        .build());
            }
            count++;
        }
        return count;
    }

    private Trick requireTrick(String name) {
        return trickRepository.findAll().stream()
                .filter(t -> name.equalsIgnoreCase(t.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Figure introuvable : " + name));
    }

    private static ProgressSeed mastered(Trick trick) {
        return new ProgressSeed(trick, UserProgress.ProgressStatus.MASTERED, 8, 100);
    }

    private static ProgressSeed inProgress(Trick trick, int attempts, int mastery) {
        return new ProgressSeed(trick, UserProgress.ProgressStatus.IN_PROGRESS, attempts, mastery);
    }

    private void grantParentalConsent(Student student) {
        if (gdprConsentRepository
                .findByUser_IdAndConsentType(student.getId(), GdprConsent.ConsentType.PARENTAL_MINOR)
                .isPresent()) {
            return;
        }
        gdprConsentRepository.save(GdprConsent.builder()
                .user(student)
                .consentType(GdprConsent.ConsentType.PARENTAL_MINOR)
                .consentGiven(true)
                .policyVersion("1.0")
                .expiresAt(Instant.now().plusSeconds(400L * 24 * 3600))
                .build());
    }

    private record DemoStudent(
            String email,
            String firstName,
            String lastName,
            String schoolLevel,
            String jugglingLevel,
            List<ProgressSeed> progress,
            String assignedGroup) {}

    private record ProgressSeed(
            Trick trick,
            UserProgress.ProgressStatus status,
            int attempts,
            int mastery) {}
}
