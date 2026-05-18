package com.juggleflow.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentBrainModuleChapterId implements Serializable {

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "chapter_number")
    private Integer chapterNumber;
}
