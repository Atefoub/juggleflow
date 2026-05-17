// filename: backend/src/main/java/com/juggleflow/backend/service/SchoolClassService.java
package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AdminCreateSchoolClassRequest;
import com.juggleflow.backend.dto.AdminUpdateSchoolClassRequest;
import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.dto.StudentSummaryResponse;
import com.juggleflow.backend.dto.UpdateStudentGroupRequest;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.model.UserProgress;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SchoolClassService {

    private final SchoolClassRepository schoolClassRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final UserProgressRepository userProgressRepository;

    /**
     * Crée une nouvelle classe scolaire et la rattache à l'enseignant connecté.
     *
     * @param request    les données de la classe à créer
     * @param teacherEmail l'email de l'enseignant authentifié
     * @return la classe créée sous forme de DTO
     */
    @Transactional
    public SchoolClassResponse createClass(SchoolClassRequest request, String teacherEmail) {
        Teacher teacher = findTeacherByEmail(teacherEmail);

        SchoolClass schoolClass = SchoolClass.builder()
                .name(request.getName())
                .schoolLevel(request.getSchoolLevel())
                .schoolYear(request.getSchoolYear())
                .studentCount(0)
                .homeroomTeacher(teacher)
                .build();

        SchoolClass saved = schoolClassRepository.save(schoolClass);
        log.info("Classe '{}' créée par {}", saved.getName(), teacherEmail);
        return SchoolClassResponse.from(saved);
    }

    /**
     * Retourne toutes les classes dont l'enseignant connecté est titulaire.
     *
     * @param teacherEmail l'email de l'enseignant authentifié
     * @return la liste des classes sous forme de DTOs
     */
    public List<SchoolClassResponse> getMyClasses(String teacherEmail) {
        Teacher teacher = findTeacherByEmail(teacherEmail);
        return schoolClassRepository.findByHomeroomTeacher_Id(teacher.getId())
                .stream()
                .map(SchoolClassResponse::from)
                .toList();
    }

    /**
     * Retourne la liste des élèves d'une classe avec leur progression agrégée
     * et leur couleur de groupe (VERT/ORANGE/ROUGE).
     * Réservé au titulaire de la classe ou à un admin.
     *
     * @param classId      l'identifiant de la classe
     * @param teacherEmail l'email de l'enseignant authentifié
     * @return la liste des résumés élèves
     */
    public List<StudentSummaryResponse> getClassStudents(Long classId, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);
        return buildStudentSummariesForClass(classId);
    }

    /**
     * Assigne ou réinitialise le groupe pédagogique d'un élève (wireframe 11).
     */
    @Transactional
    public StudentSummaryResponse updateStudentGroup(
            Long classId,
            Long studentId,
            UpdateStudentGroupRequest request,
            String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);

        Student student = studentRepository.findByIdAndSchoolClass_Id(studentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Élève introuvable dans la classe " + classId));

        if (request.getGroupColor() == null) {
            student.setAssignedGroupColor(null);
        } else {
            student.setAssignedGroupColor(request.getGroupColor().name());
        }
        studentRepository.save(student);

        log.info("Groupe élève {} en classe {} → {}",
                studentId, classId,
                request.getGroupColor() != null ? request.getGroupColor() : "AUTO");

        return toStudentSummary(student);
    }

    private List<StudentSummaryResponse> buildStudentSummariesForClass(Long classId) {
        return studentRepository.findBySchoolClass_Id(classId).stream()
                .map(this::toStudentSummary)
                .toList();
    }

    private StudentSummaryResponse toStudentSummary(Student student) {
        List<UserProgress> progressList =
                userProgressRepository.findByUser_Id(student.getId());

        int total = progressList.size();
        long mastered = progressList.stream()
                .filter(p -> p.getStatus() == UserProgress.ProgressStatus.MASTERED)
                .count();

        int percent = total == 0 ? 0 : (int) ((mastered * 100L) / total);

        var lastActivity = progressList.stream()
                .map(UserProgress::getLastPractice)
                .filter(java.util.Objects::nonNull)
                .max(java.util.Comparator.naturalOrder())
                .orElse(null);

        StudentSummaryResponse.GroupColor auto =
                StudentSummaryResponse.resolveGroupColor(percent);
        StudentSummaryResponse.GroupColor effective = resolveEffectiveGroupColor(student, auto);

        return StudentSummaryResponse.builder()
                .id(student.getId())
                .firstName(student.getFirstName())
                .lastName(student.getLastName())
                .progressionPercent(percent)
                .lastActivityAt(lastActivity)
                .groupColor(effective)
                .groupColorAuto(auto)
                .groupColorManual(student.getAssignedGroupColor() != null)
                .build();
    }

    private static StudentSummaryResponse.GroupColor resolveEffectiveGroupColor(
            Student student,
            StudentSummaryResponse.GroupColor auto) {
        String assigned = student.getAssignedGroupColor();
        if (assigned == null) {
            return auto;
        }
        try {
            return StudentSummaryResponse.GroupColor.valueOf(assigned);
        } catch (IllegalArgumentException ex) {
            return auto;
        }
    }

    /**
     * Ajoute un élève à une classe. Vérifie que l'enseignant est titulaire
     * et que l'élève n'est pas déjà inscrit dans cette classe.
     *
     * @param classId      l'identifiant de la classe cible
     * @param studentId    l'identifiant de l'élève à ajouter
     * @param teacherEmail l'email de l'enseignant authentifié
     */
    @Transactional
    public void addStudentToClass(Long classId, Long studentId, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);

        SchoolClass schoolClass = findClassById(classId);

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Élève", studentId));

        if (student.getSchoolClass() != null
                && student.getSchoolClass().getId().equals(classId)) {
            throw new IllegalArgumentException(
                "L'élève est déjà inscrit dans cette classe");
        }

        student.setSchoolClass(schoolClass);
        schoolClass.setStudentCount(schoolClass.getStudentCount() + 1);
        studentRepository.save(student);
        schoolClassRepository.save(schoolClass);

        log.info("Élève {} ajouté à la classe {}", studentId, classId);
    }

    /**
     * Retire un élève d'une classe.
     *
     * @param classId      l'identifiant de la classe
     * @param studentId    l'identifiant de l'élève à retirer
     * @param teacherEmail l'email de l'enseignant authentifié
     */
    @Transactional
    public void removeStudentFromClass(Long classId, Long studentId, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);

        SchoolClass schoolClass = findClassById(classId);

        Student student = studentRepository.findByIdAndSchoolClass_Id(studentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Élève introuvable dans la classe " + classId));

        student.setSchoolClass(null);
        int newCount = Math.max(0, schoolClass.getStudentCount() - 1);
        schoolClass.setStudentCount(newCount);
        studentRepository.save(student);
        schoolClassRepository.save(schoolClass);

        log.info("Élève {} retiré de la classe {}", studentId, classId);
    }

    /**
     * Supprime une classe. Impossible si elle contient encore des élèves.
     *
     * @param classId      l'identifiant de la classe à supprimer
     * @param teacherEmail l'email de l'enseignant authentifié
     */
    @Transactional
    public void deleteClass(Long classId, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);

        int studentCount = studentRepository.countBySchoolClass_Id(classId);
        if (studentCount > 0) {
            throw new IllegalArgumentException(
                "Impossible de supprimer une classe contenant des élèves. "
                + "Retirez d'abord les " + studentCount + " élève(s) de la classe.");
        }

        schoolClassRepository.deleteById(classId);
        log.info("Classe {} supprimée par {}", classId, teacherEmail);
    }

    // ── Administration (ROLE_ADMINISTRATEUR) ─────────────────────

    /**
     * Crée une classe en choisissant explicitement le titulaire (enseignant).
     */
    @Transactional
    public SchoolClassResponse createClassAsAdmin(AdminCreateSchoolClassRequest request) {
        Teacher teacher = teacherRepository.findById(request.getHomeroomTeacherId())
            .orElseThrow(() -> new ResourceNotFoundException("Enseignant", request.getHomeroomTeacherId()));

        SchoolClass schoolClass = SchoolClass.builder()
            .name(request.getName())
            .schoolLevel(request.getSchoolLevel())
            .schoolYear(request.getSchoolYear())
            .studentCount(0)
            .homeroomTeacher(teacher)
            .build();

        SchoolClass saved = schoolClassRepository.save(schoolClass);
        log.info("Classe '{}' créée par admin (titulaire id={})", saved.getName(), teacher.getId());
        return SchoolClassResponse.from(saved);
    }

    /**
     * Met à jour une classe (champs fournis uniquement).
     */
    @Transactional
    public SchoolClassResponse updateClassAsAdmin(Long classId, AdminUpdateSchoolClassRequest request) {
        SchoolClass sc = findClassById(classId);

        if (StringUtils.hasText(request.getName())) {
            sc.setName(request.getName().trim());
        }
        if (StringUtils.hasText(request.getSchoolLevel())) {
            sc.setSchoolLevel(request.getSchoolLevel());
        }
        if (request.getSchoolYear() != null) {
            sc.setSchoolYear(request.getSchoolYear());
        }
        if (request.getHomeroomTeacherId() != null) {
            Teacher teacher = teacherRepository.findById(request.getHomeroomTeacherId())
                .orElseThrow(() -> new ResourceNotFoundException("Enseignant", request.getHomeroomTeacherId()));
            sc.setHomeroomTeacher(teacher);
        }

        return SchoolClassResponse.from(schoolClassRepository.save(sc));
    }

    /**
     * Liste les élèves d'une classe (admin, sans vérification titulaire).
     */
    public List<StudentSummaryResponse> getClassStudentsAsAdmin(Long classId) {
        findClassById(classId);
        return buildStudentSummariesForClass(classId);
    }

    @Transactional
    public void deleteClassAsAdmin(Long classId) {
        findClassById(classId);
        int studentCount = studentRepository.countBySchoolClass_Id(classId);
        if (studentCount > 0) {
            throw new IllegalArgumentException(
                "Impossible de supprimer une classe contenant des élèves. "
                + "Retirez d'abord les " + studentCount + " élève(s) de la classe.");
        }
        schoolClassRepository.deleteById(classId);
        log.info("Classe {} supprimée par admin", classId);
    }

    // ── Helpers privés ───────────────────────────────────────────

    private Teacher findTeacherByEmail(String email) {
        return teacherRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Enseignant introuvable : " + email));
    }

    private SchoolClass findClassById(Long classId) {
        return schoolClassRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Classe", classId));
    }

    private void assertClassOwnership(Long classId, String teacherEmail) {
        Teacher teacher = findTeacherByEmail(teacherEmail);
        if (!schoolClassRepository.existsByIdAndHomeroomTeacher_Id(
                classId, teacher.getId())) {
            throw new ResourceNotFoundException(
                "Classe introuvable ou accès non autorisé : " + classId);
        }
    }
}
