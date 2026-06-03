package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AssignPathRequest;
import com.juggleflow.backend.dto.AssignPathToStudentRequest;
import com.juggleflow.backend.dto.ClassStudentPathOverviewResponse;
import com.juggleflow.backend.dto.LearningPathResponse;
import com.juggleflow.backend.dto.StudentPathAssignmentResponse;
import com.juggleflow.backend.dto.StudentPathProgressResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.ClassLearningPath;
import com.juggleflow.backend.model.LearningPath;
import com.juggleflow.backend.model.StudentLearningPath;
import com.juggleflow.backend.model.LearningPathStep;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.LearningPathRepository;
import com.juggleflow.backend.repository.StudentLearningPathRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningPathService {

    private final LearningPathRepository learningPathRepository;
    private final ClassLearningPathRepository classLearningPathRepository;
    private final StudentLearningPathRepository studentLearningPathRepository;
    private final PathAssignmentResolver pathAssignmentResolver;
    private final SchoolClassRepository schoolClassRepository;
    private final StudentRepository studentRepository;
    private final TeacherClassAccessService teacherClassAccessService;
    private final UserProgressRepository userProgressRepository;

    /**
     * Retourne tous les parcours actifs, avec filtre optionnel par niveau.
     *
     * @param levelFilter niveau cible en String (ex : "BEGINNER"), ou null pour tous
     * @return la liste des parcours sous forme de DTOs
     */
    public List<LearningPathResponse> getAllPaths(String levelFilter) {
        List<LearningPath> paths;

        if (levelFilter != null && !levelFilter.isBlank()) {
            LearningPath.TargetLevel level = parseLevel(levelFilter);
            paths = learningPathRepository.findByActiveTrueAndTargetLevel(level);
        } else {
            paths = learningPathRepository.findByActiveTrue();
        }

        return paths.stream()
                .map(LearningPathResponse::from)
                .toList();
    }

    /**
     * Retourne les parcours assignés à la classe de l'élève connecté.
     * Si l'élève n'a pas de classe rattachée, retourne une liste vide.
     *
     * Parcours effectifs : assignation individuelle si présente, sinon classe.
     */
    public List<LearningPathResponse> getMyAssignedPaths(String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Élève introuvable ou accès non autorisé"));

        Long classId = student.getSchoolClass() != null
                ? student.getSchoolClass().getId()
                : null;

        return pathAssignmentResolver.resolveAllPathsForStudent(student.getId(), classId).stream()
                .map(LearningPathResponse::from)
                .toList();
    }

    /**
     * Retourne les parcours assignés à une classe donnée (vue enseignant).
     * Vérifie que l'enseignant connecté est bien titulaire de la classe.
     */
    public List<LearningPathResponse> getAssignedPathsForClass(Long classId, String teacherEmail) {
        teacherClassAccessService.assertClassOwnedByTeacher(classId, teacherEmail);

        return classLearningPathRepository.findBySchoolClass_Id(classId).stream()
                .map(ClassLearningPath::getLearningPath)
                .distinct()
                .map(LearningPathResponse::from)
                .toList();
    }

    /**
     * Retourne le détail complet d'un parcours avec ses étapes et figures.
     *
     * @param id l'identifiant du parcours
     * @return le parcours sous forme de DTO
     */
    public LearningPathResponse getPathById(Long id) {
        LearningPath path = learningPathRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Parcours", id));
        return LearningPathResponse.from(path);
    }

    /**
     * Assigne un parcours à une classe scolaire.
     * Vérifie que l'enseignant est titulaire de la classe et qu'aucun
     * parcours identique n'est déjà assigné.
     *
     * @param request      la requête d'assignation
     * @param teacherEmail l'email de l'enseignant authentifié
     * @return l'assignation créée sous forme de réponse simplifiée
     */
    @Transactional
    public LearningPathResponse assignToClass(AssignPathRequest request, String teacherEmail) {
        teacherClassAccessService.assertClassOwnedByTeacher(request.getClassId(), teacherEmail);

        LearningPath path = learningPathRepository.findById(request.getLearningPathId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Parcours", request.getLearningPathId()));

        SchoolClass schoolClass = schoolClassRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Classe", request.getClassId()));

        // Vérification unicité : un même parcours ne peut être assigné
        // qu'une seule fois à la même classe
        Optional<ClassLearningPath> existing =
                classLearningPathRepository.findByLearningPath_IdAndSchoolClass_Id(
                    path.getId(), schoolClass.getId());

        if (existing.isPresent()) {
            throw new IllegalArgumentException(
                "Le parcours '" + path.getPathName()
                + "' est déjà assigné à cette classe.");
        }

        ClassLearningPath assignment = ClassLearningPath.builder()
                .learningPath(path)
                .schoolClass(schoolClass)
                .startDate(request.getStartDate())
                .expectedEndDate(request.getExpectedEndDate())
                .build();

        classLearningPathRepository.save(assignment);
        log.info("Parcours '{}' assigné à la classe {} par {}",
            path.getPathName(), schoolClass.getId(), teacherEmail);

        return LearningPathResponse.from(path);
    }

    /**
     * Désassigne un parcours d'une classe scolaire.
     *
     * @param classId      l'identifiant de la classe
     * @param pathId       l'identifiant du parcours à désassigner
     * @param teacherEmail l'email de l'enseignant authentifié
     */
    @Transactional
    public void unassignFromClass(Long classId, Long pathId, String teacherEmail) {
        teacherClassAccessService.assertClassOwnedByTeacher(classId, teacherEmail);

        classLearningPathRepository.findByLearningPath_IdAndSchoolClass_Id(pathId, classId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Assignation introuvable pour la classe " + classId
                    + " et le parcours " + pathId));

        classLearningPathRepository.deleteByLearningPath_IdAndSchoolClass_Id(pathId, classId);
        log.info("Parcours {} désassigné de la classe {} par {}", pathId, classId, teacherEmail);
    }

    /**
     * Parcours assignés à un élève (individuellement ou via la classe).
     */
    public List<LearningPathResponse> getAssignedPathsForStudent(
            Long classId, Long studentId, String teacherEmail) {
        teacherClassAccessService.requireStudentInClass(classId, studentId, teacherEmail);
        return pathAssignmentResolver.resolveAllPathsForStudent(studentId, classId).stream()
                .map(LearningPathResponse::from)
                .toList();
    }

    /**
     * Parcours effectif principal d'un élève (individuel prioritaire sur classe).
     */
    public StudentPathAssignmentResponse getEffectiveAssignmentForStudent(
            Long classId, Long studentId, String teacherEmail) {
        teacherClassAccessService.requireStudentInClass(classId, studentId, teacherEmail);

        return pathAssignmentResolver.resolvePrimaryPath(studentId, classId)
                .map(resolved -> StudentPathAssignmentResponse.builder()
                        .studentId(studentId)
                        .learningPathId(resolved.path().getId())
                        .pathName(resolved.path().getPathName())
                        .startDate(resolved.startDate())
                        .expectedEndDate(resolved.expectedEndDate())
                        .assignmentSource(resolved.source().name())
                        .build())
                .orElse(null);
    }

    @Transactional
    public LearningPathResponse assignToStudent(
            Long classId,
            AssignPathToStudentRequest request,
            String teacherEmail) {

        Student student = teacherClassAccessService.requireStudentInClass(
                classId, request.getStudentId(), teacherEmail);

        LearningPath path = learningPathRepository.findById(request.getLearningPathId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Parcours", request.getLearningPathId()));

        Optional<StudentLearningPath> existing =
                studentLearningPathRepository.findByLearningPath_IdAndStudent_Id(
                        path.getId(), student.getId());

        if (existing.isPresent()) {
            throw new IllegalArgumentException(
                    "Le parcours '" + path.getPathName()
                    + "' est déjà assigné à cet élève.");
        }

        StudentLearningPath assignment = StudentLearningPath.builder()
                .student(student)
                .learningPath(path)
                .startDate(request.getStartDate())
                .expectedEndDate(request.getExpectedEndDate())
                .build();

        studentLearningPathRepository.save(assignment);
        log.info("Parcours '{}' assigné à l'élève {} (classe {}) par {}",
                path.getPathName(), student.getId(), classId, teacherEmail);

        return LearningPathResponse.from(path);
    }

    @Transactional
    public void unassignFromStudent(
            Long classId, Long studentId, Long pathId, String teacherEmail) {

        teacherClassAccessService.requireStudentInClass(classId, studentId, teacherEmail);

        studentLearningPathRepository.findByLearningPath_IdAndStudent_Id(pathId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Assignation introuvable pour l'élève " + studentId
                        + " et le parcours " + pathId));

        studentLearningPathRepository.deleteByLearningPath_IdAndStudent_Id(pathId, studentId);
        log.info("Parcours {} désassigné de l'élève {} par {}", pathId, studentId, teacherEmail);
    }

    /**
     * Vue synthétique : parcours effectif et progression par élève de la classe.
     */
    public List<ClassStudentPathOverviewResponse> getClassPathOverview(
            Long classId, String teacherEmail) {

        teacherClassAccessService.assertClassOwnedByTeacher(classId, teacherEmail);

        List<Student> students = studentRepository.findBySchoolClass_Id(classId);

        return students.stream().map(student -> {
            var resolved = pathAssignmentResolver.resolvePrimaryPath(student.getId(), classId);
            if (resolved.isEmpty()) {
                return ClassStudentPathOverviewResponse.builder()
                        .studentId(student.getId())
                        .firstName(student.getFirstName())
                        .lastName(student.getLastName())
                        .completionPercent(0)
                        .build();
            }

            var path = resolved.get().path();
            List<LearningPathStep> steps = path.getSteps();
            int percent = computeCompletionPercent(student.getId(), steps);

            return ClassStudentPathOverviewResponse.builder()
                    .studentId(student.getId())
                    .firstName(student.getFirstName())
                    .lastName(student.getLastName())
                    .learningPathId(path.getId())
                    .pathName(path.getPathName())
                    .completionPercent(percent)
                    .assignmentSource(resolved.get().source().name())
                    .build();
        }).toList();
    }

    /**
     * Calcule la progression de chaque élève d'une classe sur un parcours donné.
     * Pour chaque élève, calcule le pourcentage de figures du parcours
     * marquées MASTERED dans user_progress.
     *
     * @param classId      l'identifiant de la classe
     * @param pathId       l'identifiant du parcours
     * @param teacherEmail l'email de l'enseignant authentifié
     * @return la liste des progressions par élève
     */
    public List<StudentPathProgressResponse> getStudentProgress(
            Long classId, Long pathId, String teacherEmail) {

        teacherClassAccessService.assertClassOwnedByTeacher(classId, teacherEmail);

        LearningPath path = learningPathRepository.findById(pathId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcours", pathId));

        List<LearningPathStep> steps = path.getSteps();
        List<Long> trickIds = steps.stream()
                .map(s -> s.getTrick().getId())
                .toList();

        List<Student> students = studentRepository.findBySchoolClass_Id(classId).stream()
                .filter(student -> isStudentOnPath(student.getId(), classId, pathId))
                .toList();

        return students.stream().map(student -> {
            // Charger toute la progression de l'élève et filtrer sur les figures du parcours
            List<UserProgress> allProgress =
                    userProgressRepository.findByUser_Id(student.getId());

            Map<Long, UserProgress> progressByTrickId = allProgress.stream()
                    .filter(p -> trickIds.contains(p.getTrick().getId()))
                    .collect(Collectors.toMap(
                        p -> p.getTrick().getId(),
                        p -> p
                    ));

            List<StudentPathProgressResponse.TrickProgressDetail> details =
                    steps.stream()
                            .map(step -> toTrickProgressDetail(step, progressByTrickId.get(step.getTrick().getId())))
                            .toList();

            long masteredCount = details.stream()
                    .filter(d -> UserProgress.ProgressStatus.MASTERED.name().equals(d.getStatus()))
                    .count();

            int total = steps.size();
            int percent = total == 0 ? 0 : (int) ((masteredCount * 100L) / total);

            return StudentPathProgressResponse.builder()
                    .studentId(student.getId())
                    .firstName(student.getFirstName())
                    .lastName(student.getLastName())
                    .completionPercent(percent)
                    .masteredCount((int) masteredCount)
                    .totalSteps(total)
                    .trickDetails(details)
                    .build();
        }).toList();
    }

    /**
     * Retourne la progression d'UN élève sur un parcours donné (vue enseignant).
     * Optimisation: évite de renvoyer la liste complète de la classe.
     */
    public StudentPathProgressResponse getStudentProgressForStudent(
            Long classId, Long pathId, Long studentId, String teacherEmail) {

        teacherClassAccessService.assertClassOwnedByTeacher(classId, teacherEmail);

        LearningPath path = learningPathRepository.findById(pathId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcours", pathId));

        Student student = teacherClassAccessService.requireStudentInClass(
                classId, studentId, teacherEmail);

        List<LearningPathStep> steps = path.getSteps();
        List<Long> trickIds = steps.stream()
                .map(s -> s.getTrick().getId())
                .toList();

        List<UserProgress> allProgress = userProgressRepository.findByUser_Id(student.getId());

        Map<Long, UserProgress> progressByTrickId = allProgress.stream()
                .filter(p -> trickIds.contains(p.getTrick().getId()))
                .collect(Collectors.toMap(
                        p -> p.getTrick().getId(),
                        p -> p
                ));

        List<StudentPathProgressResponse.TrickProgressDetail> details =
                steps.stream()
                        .map(step -> toTrickProgressDetail(step, progressByTrickId.get(step.getTrick().getId())))
                        .toList();

        long masteredCount = details.stream()
                .filter(d -> UserProgress.ProgressStatus.MASTERED.name().equals(d.getStatus()))
                .count();

        int total = steps.size();
        int percent = total == 0 ? 0 : (int) ((masteredCount * 100L) / total);

        return StudentPathProgressResponse.builder()
                .studentId(student.getId())
                .firstName(student.getFirstName())
                .lastName(student.getLastName())
                .completionPercent(percent)
                .masteredCount((int) masteredCount)
                .totalSteps(total)
                .trickDetails(details)
                .build();
    }


    private static StudentPathProgressResponse.TrickProgressDetail toTrickProgressDetail(
            LearningPathStep step,
            UserProgress progress) {
        String status = progress != null
                ? progress.getStatus().name()
                : UserProgress.ProgressStatus.NOT_STARTED.name();

        return StudentPathProgressResponse.TrickProgressDetail.builder()
                .trickId(step.getTrick().getId())
                .trickName(step.getTrick().getName())
                .status(status)
                .attemptCount(progress != null ? progress.getAttemptCount() : 0)
                .masteryPercentage(progress != null ? progress.getMasteryPercentage() : null)
                .blocked(StudentBlockageService.isBlocked(progress))
                .build();
    }

    private boolean isStudentOnPath(Long studentId, Long classId, Long pathId) {
        return pathAssignmentResolver.resolveAllPathsForStudent(studentId, classId).stream()
                .anyMatch(p -> p.getId().equals(pathId));
    }

    private int computeCompletionPercent(Long studentId, List<LearningPathStep> steps) {
        if (steps.isEmpty()) {
            return 0;
        }
        List<Long> trickIds = steps.stream()
                .map(s -> s.getTrick().getId())
                .toList();
        long masteredCount = userProgressRepository.findByUser_Id(studentId).stream()
                .filter(p -> trickIds.contains(p.getTrick().getId()))
                .filter(p -> p.getStatus() == UserProgress.ProgressStatus.MASTERED)
                .count();
        return (int) ((masteredCount * 100L) / steps.size());
    }

    private LearningPath.TargetLevel parseLevel(String level) {
        try {
            return LearningPath.TargetLevel.valueOf(level.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Niveau invalide : '" + level
                + "'. Valeurs acceptées : BEGINNER, INTERMEDIATE, ADVANCED, EXPERT");
        }
    }
}
