package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.BrainModuleProgressResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.model.StudentBrainModuleChapter;
import com.juggleflow.backend.model.StudentBrainModuleChapterId;
import com.juggleflow.backend.repository.StudentBrainModuleChapterRepository;
import com.juggleflow.backend.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BrainModuleProgressService {

    public static final int CHAPTER_COUNT = 3;

    private final StudentRepository studentRepository;
    private final StudentBrainModuleChapterRepository chapterRepository;

    @Transactional(readOnly = true)
    public BrainModuleProgressResponse getProgress(String studentEmail) {
        Student student = findStudent(studentEmail);
        List<Integer> completed = chapterRepository
            .findById_UserIdOrderById_ChapterNumberAsc(student.getId())
            .stream()
            .map(row -> row.getId().getChapterNumber())
            .toList();

        return BrainModuleProgressResponse.builder()
            .started(!completed.isEmpty())
            .completedChapters(completed)
            .build();
    }

    @Transactional
    public BrainModuleProgressResponse completeChapter(String studentEmail, int chapterNumber) {
        if (chapterNumber < 1 || chapterNumber > CHAPTER_COUNT) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Numéro de chapitre invalide (1 à " + CHAPTER_COUNT + ").");
        }

        Student student = findStudent(studentEmail);

        if (chapterNumber > 1) {
            int previous = chapterNumber - 1;
            if (!chapterRepository.existsById_UserIdAndId_ChapterNumber(student.getId(), previous)) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Terminez d'abord le chapitre " + previous + ".");
            }
        }

        StudentBrainModuleChapterId id = new StudentBrainModuleChapterId(student.getId(), chapterNumber);
        if (!chapterRepository.existsById(id)) {
            chapterRepository.save(StudentBrainModuleChapter.builder()
                .id(id)
                .student(student)
                .build());
        }

        return getProgress(studentEmail);
    }

    private Student findStudent(String email) {
        return studentRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Élève introuvable pour cette session."));
    }
}
