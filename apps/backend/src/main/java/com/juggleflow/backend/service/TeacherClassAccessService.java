package com.juggleflow.backend.service;

import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Vérifications d'accès enseignant → classe / élève (anti-IDOR).
 */
@Component
@RequiredArgsConstructor
public class TeacherClassAccessService {

    private final TeacherRepository teacherRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final StudentRepository studentRepository;

    public Teacher requireTeacher(String teacherEmail) {
        return teacherRepository.findByEmail(teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Enseignant introuvable : " + teacherEmail));
    }

    public void assertClassOwnedByTeacher(Long classId, String teacherEmail) {
        Teacher teacher = requireTeacher(teacherEmail);
        if (!schoolClassRepository.existsByIdAndHomeroomTeacher_Id(classId, teacher.getId())) {
            throw new ResourceNotFoundException(
                    "Classe introuvable ou accès non autorisé : " + classId);
        }
    }

    public Student requireStudentInClass(Long classId, Long studentId, String teacherEmail) {
        assertClassOwnedByTeacher(classId, teacherEmail);
        return studentRepository.findByIdAndSchoolClass_Id(studentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Élève introuvable dans cette classe : " + studentId));
    }
}
