package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.StudentBrainModuleChapter;
import com.juggleflow.backend.model.StudentBrainModuleChapterId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentBrainModuleChapterRepository
    extends JpaRepository<StudentBrainModuleChapter, StudentBrainModuleChapterId> {

    List<StudentBrainModuleChapter> findById_UserIdOrderById_ChapterNumberAsc(Long userId);

    boolean existsById_UserIdAndId_ChapterNumber(Long userId, Integer chapterNumber);
}
