package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AssignPathRequest;
import com.juggleflow.backend.dto.AssignPathToStudentRequest;
import com.juggleflow.backend.dto.LearningPathResponse;
import com.juggleflow.backend.dto.StudentPathAssignmentResponse;
import com.juggleflow.backend.model.LearningPath;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.LearningPathRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentLearningPathRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import com.juggleflow.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Rollback
class LearningPathServiceTest {

    @Autowired private LearningPathService learningPathService;
    @Autowired private LearningPathRepository learningPathRepository;
    @Autowired private ClassLearningPathRepository classLearningPathRepository;
    @Autowired private StudentLearningPathRepository studentLearningPathRepository;
    @Autowired private SchoolClassRepository schoolClassRepository;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Teacher teacher;
    private SchoolClass schoolClass;
    private Student student;
    private LearningPath classPath;
    private LearningPath studentPath;

    @BeforeEach
    void setUp() {
        studentLearningPathRepository.deleteAll();
        classLearningPathRepository.deleteAll();
        studentRepository.deleteAll();
        schoolClassRepository.deleteAll();
        learningPathRepository.deleteAll();
        userRepository.deleteAll();

        teacher = teacherRepository.save(Teacher.builder()
                .email("lp.teacher@test.fr")
                .password(passwordEncoder.encode("Test2026!"))
                .firstName("Marie")
                .lastName("Test")
                .enabled(true)
                .certified(true)
                .build());

        schoolClass = schoolClassRepository.save(SchoolClass.builder()
                .name("CE2 — Test")
                .schoolLevel("CE2")
                .schoolYear(2026)
                .studentCount(1)
                .homeroomTeacher(teacher)
                .build());

        student = studentRepository.save(Student.builder()
                .email("lp.student@test.fr")
                .password(passwordEncoder.encode("Test2026!"))
                .firstName("Lucas")
                .lastName("Test")
                .enabled(true)
                .schoolClass(schoolClass)
                .schoolLevel("CE2")
                .enrollmentDate(LocalDate.now().minusMonths(1))
                .build());

        classPath = persistPath("Parcours classe");
        studentPath = persistPath("Parcours individuel");
    }

    @Test
    @DisplayName("assignToClass puis effective assignment → source CLASS")
    void assignToClass_shouldExposeClassAssignment() {
        learningPathService.assignToClass(buildClassAssign(classPath.getId()), teacher.getEmail());

        StudentPathAssignmentResponse effective =
                learningPathService.getEffectiveAssignmentForStudent(
                        schoolClass.getId(), student.getId(), teacher.getEmail());

        assertThat(effective).isNotNull();
        assertThat(effective.getLearningPathId()).isEqualTo(classPath.getId());
        assertThat(effective.getAssignmentSource()).isEqualTo("CLASS");
    }

    @Test
    @DisplayName("assignation élève prioritaire sur parcours de classe")
    void assignToStudent_shouldOverrideClassAssignment() {
        learningPathService.assignToClass(buildClassAssign(classPath.getId()), teacher.getEmail());

        AssignPathToStudentRequest studentReq = new AssignPathToStudentRequest();
        studentReq.setStudentId(student.getId());
        studentReq.setLearningPathId(studentPath.getId());
        studentReq.setStartDate(LocalDate.now());
        learningPathService.assignToStudent(
                schoolClass.getId(), studentReq, teacher.getEmail());

        StudentPathAssignmentResponse effective =
                learningPathService.getEffectiveAssignmentForStudent(
                        schoolClass.getId(), student.getId(), teacher.getEmail());

        assertThat(effective).isNotNull();
        assertThat(effective.getLearningPathId()).isEqualTo(studentPath.getId());
        assertThat(effective.getAssignmentSource()).isEqualTo("STUDENT");

        List<LearningPathResponse> allPaths = learningPathService.getAssignedPathsForStudent(
                schoolClass.getId(), student.getId(), teacher.getEmail());
        assertThat(allPaths).extracting(LearningPathResponse::getId).contains(studentPath.getId());
    }

    @Test
    @DisplayName("unassign élève → retour au parcours de classe")
    void unassignFromStudent_shouldFallBackToClassPath() {
        learningPathService.assignToClass(buildClassAssign(classPath.getId()), teacher.getEmail());

        AssignPathToStudentRequest studentReq = new AssignPathToStudentRequest();
        studentReq.setStudentId(student.getId());
        studentReq.setLearningPathId(studentPath.getId());
        studentReq.setStartDate(LocalDate.now());
        learningPathService.assignToStudent(
                schoolClass.getId(), studentReq, teacher.getEmail());

        learningPathService.unassignFromStudent(
                schoolClass.getId(), student.getId(), studentPath.getId(), teacher.getEmail());

        StudentPathAssignmentResponse effective =
                learningPathService.getEffectiveAssignmentForStudent(
                        schoolClass.getId(), student.getId(), teacher.getEmail());

        assertThat(effective).isNotNull();
        assertThat(effective.getLearningPathId()).isEqualTo(classPath.getId());
        assertThat(effective.getAssignmentSource()).isEqualTo("CLASS");
    }

    @Test
    @DisplayName("assignToClass refusé pour un enseignant non titulaire")
    void assignToClass_shouldRejectForeignTeacher() {
        Teacher other = teacherRepository.save(Teacher.builder()
                .email("lp.other@test.fr")
                .password(passwordEncoder.encode("Test2026!"))
                .firstName("Pierre")
                .lastName("Autre")
                .enabled(true)
                .certified(true)
                .build());

        assertThatThrownBy(() ->
                learningPathService.assignToClass(buildClassAssign(classPath.getId()), other.getEmail()))
                .isInstanceOf(com.juggleflow.backend.exception.ResourceNotFoundException.class);
    }

    private AssignPathRequest buildClassAssign(Long pathId) {
        AssignPathRequest req = new AssignPathRequest();
        req.setClassId(schoolClass.getId());
        req.setLearningPathId(pathId);
        req.setStartDate(LocalDate.now());
        req.setExpectedEndDate(LocalDate.now().plusWeeks(8));
        return req;
    }

    private LearningPath persistPath(String name) {
        return learningPathRepository.save(LearningPath.builder()
                .pathName(name)
                .description("Test " + name)
                .targetLevel(LearningPath.TargetLevel.BEGINNER)
                .estimatedDurationDays(30)
                .active(true)
                .build());
    }
}
