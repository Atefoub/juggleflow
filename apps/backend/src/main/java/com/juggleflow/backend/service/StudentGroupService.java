package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.CreateStudentGroupRequest;
import com.juggleflow.backend.dto.ReorderGroupsRequest;
import com.juggleflow.backend.dto.StudentGroupResponse;
import com.juggleflow.backend.dto.UpdateGroupMembersRequest;
import com.juggleflow.backend.dto.UpdateStudentGroupRequest;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.StudentGroup;
import com.juggleflow.backend.model.Teacher;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentGroupRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Gestion CRUD + drag-and-drop des groupes pédagogiques d'une classe.
 *
 * <p>Tous les accès sont protégés par {@link #assertClassOwnership} : seul le
 * titulaire de la classe (ou un admin via un endpoint dédié, si ajouté plus
 * tard) peut manipuler ses groupes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudentGroupService {

    private final StudentGroupRepository groupRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;

    public List<StudentGroupResponse> listGroups(Long classId, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);
        return groupRepository.findBySchoolClass_IdWithMembers(classId).stream()
            .map(StudentGroupService::toResponse)
            .toList();
    }

    @Transactional
    public StudentGroupResponse createGroup(Long classId, CreateStudentGroupRequest body, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);
        SchoolClass schoolClass = findClassById(classId);

        String name = body.getName().trim();
        if (groupRepository.existsBySchoolClass_IdAndNameIgnoreCase(classId, name)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Un groupe portant ce nom existe deja dans la classe");
        }

        int nextPosition = groupRepository.findMaxPositionForClass(classId) + 1;
        StudentGroup group = StudentGroup.builder()
            .schoolClass(schoolClass)
            .name(name)
            .color(body.getColor())
            .position(nextPosition)
            .build();

        StudentGroup saved = groupRepository.save(group);
        log.info("Groupe '{}' (id={}) cree dans la classe {} par {}", saved.getName(), saved.getId(), classId, teacherEmail);
        return toResponse(saved);
    }

    @Transactional
    public StudentGroupResponse updateGroup(Long classId, Long groupId, UpdateStudentGroupRequest body, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);
        StudentGroup group = findGroupInClass(classId, groupId);

        if (body.getName() != null) {
            String trimmed = body.getName().trim();
            if (!trimmed.equalsIgnoreCase(group.getName())
                    && groupRepository.existsBySchoolClass_IdAndNameIgnoreCase(classId, trimmed)) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Un autre groupe porte deja ce nom dans la classe");
            }
            group.setName(trimmed);
        }
        if (body.getColor() != null) {
            group.setColor(body.getColor());
        }
        return toResponse(groupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(Long classId, Long groupId, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);
        StudentGroup group = findGroupInClass(classId, groupId);
        groupRepository.delete(group);
        log.info("Groupe {} supprime de la classe {} par {}", groupId, classId, teacherEmail);
    }

    @Transactional
    public List<StudentGroupResponse> reorderGroups(Long classId, ReorderGroupsRequest body, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);

        List<Long> orderedIds = body.getGroupIds();
        if (orderedIds == null || orderedIds.isEmpty()) {
            throw new IllegalArgumentException("La liste des groupes ne peut pas etre vide");
        }
        if (new HashSet<>(orderedIds).size() != orderedIds.size()) {
            throw new IllegalArgumentException("La liste des groupes contient des doublons");
        }

        List<StudentGroup> groups = groupRepository.findBySchoolClass_IdWithMembers(classId);
        if (groups.size() != orderedIds.size()) {
            throw new IllegalArgumentException(
                "La liste fournie ne correspond pas aux " + groups.size() + " groupe(s) de la classe");
        }

        Map<Long, StudentGroup> byId = new LinkedHashMap<>();
        for (StudentGroup g : groups) {
            byId.put(g.getId(), g);
        }
        for (Long id : orderedIds) {
            if (!byId.containsKey(id)) {
                throw new IllegalArgumentException("Groupe " + id + " absent de la classe " + classId);
            }
        }

        for (int i = 0; i < orderedIds.size(); i++) {
            byId.get(orderedIds.get(i)).setPosition(i);
        }
        groupRepository.saveAll(byId.values());
        log.info("Reordonnancement des groupes de la classe {} par {} : {}", classId, teacherEmail, orderedIds);

        return byId.values().stream()
            .sorted(Comparator.comparingInt(StudentGroup::getPosition))
            .map(StudentGroupService::toResponse)
            .toList();
    }

    @Transactional
    public StudentGroupResponse setMembers(Long classId, Long groupId, UpdateGroupMembersRequest body, String teacherEmail) {
        assertClassOwnership(classId, teacherEmail);
        StudentGroup group = findGroupInClass(classId, groupId);

        List<Long> rawIds = body.getStudentIds() == null ? List.of() : body.getStudentIds();
        Set<Long> requestedIds = new HashSet<>(rawIds);
        if (requestedIds.isEmpty()) {
            group.setMembers(new HashSet<>());
            return toResponse(groupRepository.save(group));
        }

        List<Student> classStudents = studentRepository.findBySchoolClass_Id(classId);
        Map<Long, Student> classStudentsById = new LinkedHashMap<>();
        for (Student s : classStudents) {
            classStudentsById.put(s.getId(), s);
        }

        Set<Student> resolved = new HashSet<>();
        for (Long id : requestedIds) {
            Student s = classStudentsById.get(id);
            if (s == null) {
                throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "L'eleve " + id + " n'appartient pas a la classe " + classId);
            }
            resolved.add(s);
        }
        group.setMembers(resolved);
        return toResponse(groupRepository.save(group));
    }

    // ── Helpers privés ───────────────────────────────────────────

    private void assertClassOwnership(Long classId, String teacherEmail) {
        Teacher teacher = teacherRepository.findByEmail(teacherEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Enseignant introuvable : " + teacherEmail));
        if (!schoolClassRepository.existsByIdAndHomeroomTeacher_Id(classId, teacher.getId())) {
            throw new ResourceNotFoundException(
                "Classe introuvable ou accès non autorisé : " + classId);
        }
    }

    private SchoolClass findClassById(Long classId) {
        return schoolClassRepository.findById(classId)
            .orElseThrow(() -> new ResourceNotFoundException("Classe", classId));
    }

    private StudentGroup findGroupInClass(Long classId, Long groupId) {
        return groupRepository.findByIdAndSchoolClass_Id(groupId, classId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Groupe " + groupId + " introuvable dans la classe " + classId));
    }

    private static StudentGroupResponse toResponse(StudentGroup g) {
        List<Long> memberIds = new ArrayList<>();
        if (g.getMembers() != null) {
            for (Student s : g.getMembers()) {
                memberIds.add(s.getId());
            }
            memberIds.sort(Long::compareTo);
        }
        return StudentGroupResponse.builder()
            .id(g.getId())
            .classId(g.getSchoolClass().getId())
            .name(g.getName())
            .color(g.getColor())
            .position(g.getPosition())
            .createdAt(g.getCreatedAt())
            .updatedAt(g.getUpdatedAt())
            .memberIds(memberIds)
            .memberCount(memberIds.size())
            .build();
    }
}
