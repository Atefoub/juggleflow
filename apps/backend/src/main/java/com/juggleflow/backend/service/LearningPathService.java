// filename: backend/src/main/java/com/juggleflow/backend/service/LearningPathService.java
package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AssignPathRequest;
import com.juggleflow.backend.dto.LearningPathResponse;
import com.juggleflow.backend.dto.StudentPathProgressResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.ClassLearningPath;
import com.juggleflow.backend.model.LearningPath;
import com.juggleflow.backend.model.LearningPathStep;
import com.juggleflow.backend.model.LearningPathStudentAssignment;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.LearningPathRepository;
import com.juggleflow.backend.repository.LearningPathStudentAssignmentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningPathService {

    private final LearningPathRepository learningPathRepository;
    private final ClassLearningPathRepository classLearningPathRepository;
    private final LearningPathStudentAssignmentRepository studentAssignmentRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
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
     * Retourne les parcours assignés à l'élève connecté.
     *
     * <p>Fait l'union de deux sources :
     * <ul>
     *   <li>{@link ClassLearningPath} : parcours assignés à toute la classe ;</li>
     *   <li>{@link LearningPathStudentAssignment} : assignations individuelles
     *       (sous-ensemble d'une classe).</li>
     * </ul>
     * <p>Les doublons sont dédupliqués via {@code Stream.distinct()} (basé sur
     * l'égalité d'entité, qui repose sur l'id en JPA).
     */
    public List<LearningPathResponse> getMyAssignedPaths(String studentEmail) {
        Student student = studentRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Élève introuvable ou accès non autorisé"));

        Map<Long, LearningPath> uniquePaths = new LinkedHashMap<>();

        if (student.getSchoolClass() != null) {
            for (ClassLearningPath clp :
                    classLearningPathRepository.findBySchoolClass_Id(student.getSchoolClass().getId())) {
                uniquePaths.putIfAbsent(clp.getLearningPath().getId(), clp.getLearningPath());
            }
        }
        for (LearningPathStudentAssignment a :
                studentAssignmentRepository.findByStudent_Id(student.getId())) {
            uniquePaths.putIfAbsent(a.getLearningPath().getId(), a.getLearningPath());
        }

        return uniquePaths.values().stream()
                .map(LearningPathResponse::from)
                .toList();
    }

    /**
     * Retourne les parcours visibles dans la classe (vue enseignant).
     *
     * <p>Union de {@link ClassLearningPath} (assignation classe complète) et
     * des {@link LearningPathStudentAssignment} dont l'élève cible appartient
     * à la classe.
     */
    public List<LearningPathResponse> getAssignedPathsForClass(Long classId, String teacherEmail) {
        Teacher teacher = findTeacherByEmail(teacherEmail);
        assertClassOwnership(classId, teacher.getId());

        Map<Long, LearningPath> uniquePaths = new LinkedHashMap<>();
        for (ClassLearningPath clp : classLearningPathRepository.findBySchoolClass_Id(classId)) {
            uniquePaths.putIfAbsent(clp.getLearningPath().getId(), clp.getLearningPath());
        }
        // Les assignations individuelles peuvent concerner des élèves de plusieurs
        // classes ; on filtre via le studentRepository pour ne garder que ceux de la classe.
        List<Long> classStudentIds = studentRepository.findBySchoolClass_Id(classId)
                .stream().map(Student::getId).toList();
        if (!classStudentIds.isEmpty()) {
            for (LearningPathStudentAssignment a : studentAssignmentRepository.findAll()) {
                if (classStudentIds.contains(a.getStudent().getId())) {
                    uniquePaths.putIfAbsent(a.getLearningPath().getId(), a.getLearningPath());
                }
            }
        }
        return uniquePaths.values().stream()
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
     * Assigne un parcours à une classe ou à un sous-ensemble d'élèves de cette classe.
     *
     * <ul>
     *   <li>Si {@code request.studentIds} est {@code null} → assignation classique
     *       à toute la classe (création d'un {@link ClassLearningPath}).
     *       Refus si une assignation classe existe déjà.</li>
     *   <li>Si {@code request.studentIds} est une liste non vide → assignation
     *       individuelle (création de N {@link LearningPathStudentAssignment} de
     *       source {@code INDIVIDUAL}). Refus si une assignation classe existe
     *       déjà (sinon redondant). Tous les élèves doivent appartenir à la classe.
     *       Les élèves déjà assignés individuellement sont ignorés (idempotent).</li>
     *   <li>Une liste vide explicite {@code []} est invalide (HTTP 422).</li>
     * </ul>
     */
    @Transactional
    public LearningPathResponse assignToClass(AssignPathRequest request, String teacherEmail) {
        Teacher teacher = findTeacherByEmail(teacherEmail);
        assertClassOwnership(request.getClassId(), teacher.getId());

        LearningPath path = learningPathRepository.findById(request.getLearningPathId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Parcours", request.getLearningPathId()));

        SchoolClass schoolClass = schoolClassRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Classe", request.getClassId()));

        boolean hasClassAssignment = classLearningPathRepository
                .findByLearningPath_IdAndSchoolClass_Id(path.getId(), schoolClass.getId())
                .isPresent();
        List<Long> studentIds = request.getStudentIds();

        // Cas A : assignation à toute la classe (compat existante)
        if (studentIds == null) {
            if (hasClassAssignment) {
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
            log.info("Parcours '{}' assigné à toute la classe {} par {}",
                path.getPathName(), schoolClass.getId(), teacherEmail);
            return LearningPathResponse.from(path);
        }

        // Cas B : assignation individuelle à un sous-ensemble
        if (studentIds.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "La liste des eleves cibles ne peut pas etre vide. "
                + "Pour assigner a toute la classe, omettez le champ studentIds.");
        }
        if (hasClassAssignment) {
            throw new IllegalArgumentException(
                "Le parcours '" + path.getPathName()
                + "' est déjà assigné à toute la classe : assignation individuelle redondante.");
        }

        List<Student> classStudents = studentRepository.findBySchoolClass_Id(request.getClassId());
        Map<Long, Student> classStudentsById = new LinkedHashMap<>();
        for (Student s : classStudents) {
            classStudentsById.put(s.getId(), s);
        }
        Set<Long> uniqueIds = new HashSet<>(studentIds);
        List<LearningPathStudentAssignment> toCreate = new ArrayList<>();
        for (Long id : uniqueIds) {
            Student student = classStudentsById.get(id);
            if (student == null) {
                throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "L'eleve " + id + " n'appartient pas a la classe " + request.getClassId());
            }
            if (!studentAssignmentRepository
                    .existsByLearningPath_IdAndStudent_Id(path.getId(), id)) {
                toCreate.add(LearningPathStudentAssignment.builder()
                    .learningPath(path)
                    .student(student)
                    .source(LearningPathStudentAssignment.AssignmentSource.INDIVIDUAL)
                    .build());
            }
        }
        if (!toCreate.isEmpty()) {
            studentAssignmentRepository.saveAll(toCreate);
        }
        log.info("Parcours '{}' assigné individuellement à {} eleve(s) de la classe {} par {}",
            path.getPathName(), toCreate.size(), schoolClass.getId(), teacherEmail);

        return LearningPathResponse.from(path);
    }

    /**
     * Désassigne un parcours d'une classe scolaire.
     *
     * @param classId      l'identifiant de la classe
     * @param pathId       l'identifiant du parcours à désassigner
     * @param teacherEmail l'email de l'enseignant authentifié
     */
    /**
     * Désassigne un parcours d'une classe.
     *
     * <p>Supprime à la fois l'assignation classe ({@link ClassLearningPath}) si elle
     * existe ET toutes les assignations individuelles ({@link LearningPathStudentAssignment})
     * pour les élèves de cette classe. Au moins une des deux doit exister.
     */
    @Transactional
    public void unassignFromClass(Long classId, Long pathId, String teacherEmail) {
        Teacher teacher = findTeacherByEmail(teacherEmail);
        assertClassOwnership(classId, teacher.getId());

        boolean hadClassAssignment = classLearningPathRepository
                .findByLearningPath_IdAndSchoolClass_Id(pathId, classId).isPresent();
        if (hadClassAssignment) {
            classLearningPathRepository.deleteByLearningPath_IdAndSchoolClass_Id(pathId, classId);
        }

        List<LearningPathStudentAssignment> individualAssignments =
                studentAssignmentRepository.findByLearningPath_IdAndStudent_SchoolClass_Id(pathId, classId);
        if (!individualAssignments.isEmpty()) {
            studentAssignmentRepository.deleteAll(individualAssignments);
        }

        if (!hadClassAssignment && individualAssignments.isEmpty()) {
            throw new ResourceNotFoundException(
                "Assignation introuvable pour la classe " + classId
                + " et le parcours " + pathId);
        }
        log.info("Parcours {} désassigné de la classe {} ({} individuelle(s) supprimee(s)) par {}",
            pathId, classId, individualAssignments.size(), teacherEmail);
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

        Teacher teacher = findTeacherByEmail(teacherEmail);
        assertClassOwnership(classId, teacher.getId());

        LearningPath path = learningPathRepository.findById(pathId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcours", pathId));

        List<LearningPathStep> steps = path.getSteps();
        List<Long> trickIds = steps.stream()
                .map(s -> s.getTrick().getId())
                .toList();

        // Si une ClassLearningPath existe : tous les eleves de la classe sont concernes.
        // Sinon : seuls les eleves ayant une assignation individuelle (sous-ensemble).
        boolean hasClassAssignment = classLearningPathRepository
                .findByLearningPath_IdAndSchoolClass_Id(pathId, classId).isPresent();

        List<Student> students;
        if (hasClassAssignment) {
            students = studentRepository.findBySchoolClass_Id(classId);
        } else {
            students = studentAssignmentRepository
                    .findByLearningPath_IdAndStudent_SchoolClass_Id(pathId, classId)
                    .stream()
                    .map(LearningPathStudentAssignment::getStudent)
                    .toList();
        }

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
                    steps.stream().map(step -> {
                        Long trickId = step.getTrick().getId();
                        UserProgress progress = progressByTrickId.get(trickId);
                        String status = progress != null
                                ? progress.getStatus().name()
                                : UserProgress.ProgressStatus.NOT_STARTED.name();

                        return StudentPathProgressResponse.TrickProgressDetail.builder()
                                .trickId(trickId)
                                .trickName(step.getTrick().getName())
                                .status(status)
                                .build();
                    }).toList();

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

        Teacher teacher = findTeacherByEmail(teacherEmail);
        assertClassOwnership(classId, teacher.getId());

        LearningPath path = learningPathRepository.findById(pathId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcours", pathId));

        Student student = studentRepository.findByIdAndSchoolClass_Id(studentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Élève introuvable dans cette classe : " + studentId));

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
                steps.stream().map(step -> {
                    Long trickId = step.getTrick().getId();
                    UserProgress progress = progressByTrickId.get(trickId);
                    String status = progress != null
                            ? progress.getStatus().name()
                            : UserProgress.ProgressStatus.NOT_STARTED.name();

                    return StudentPathProgressResponse.TrickProgressDetail.builder()
                            .trickId(trickId)
                            .trickName(step.getTrick().getName())
                            .status(status)
                            .build();
                }).toList();

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

    // ── Helpers privés ───────────────────────────────────────────

    private Teacher findTeacherByEmail(String email) {
        return teacherRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Enseignant introuvable : " + email));
    }

    private void assertClassOwnership(Long classId, Long teacherId) {
        if (!schoolClassRepository.existsByIdAndHomeroomTeacher_Id(classId, teacherId)) {
            throw new ResourceNotFoundException(
                "Classe introuvable ou accès non autorisé : " + classId);
        }
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
