// filename: backend/src/main/java/com/juggleflow/backend/service/SchoolClassService.java
package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.dto.SchoolClassResponse;
import com.juggleflow.backend.dto.StudentSummaryResponse;
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

        List<Student> students = studentRepository.findBySchoolClass_Id(classId);

        return students.stream().map(student -> {
            List<UserProgress> progressList =
                    userProgressRepository.findByUser_Id(student.getId());

            int total = progressList.size();
            long mastered = progressList.stream()
                    .filter(p -> p.getStatus() == UserProgress.ProgressStatus.MASTERED)
                    .count();

            int percent = total == 0 ? 0 : (int) ((mastered * 100L) / total);

            // Dernière activité = dernière mise à jour de progression
            var lastActivity = progressList.stream()
                    .map(UserProgress::getLastPractice)
                    .filter(java.util.Objects::nonNull)
                    .max(java.util.Comparator.naturalOrder())
                    .orElse(null);

            return StudentSummaryResponse.builder()
                    .id(student.getId())
                    .firstName(student.getFirstName())
                    .lastName(student.getLastName())
                    .progressionPercent(percent)
                    .lastActivityAt(lastActivity)
                    .groupColor(StudentSummaryResponse.resolveGroupColor(percent))
                    .build();
        }).toList();
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
