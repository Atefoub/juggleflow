package com.juggleflow.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pedagogical_resource")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PedagogicalResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "resource_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Audience audience;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", nullable = false, length = 40)
    private ResourceType resourceType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String subtitle;

    @Column(name = "meta_label", length = 100)
    private String metaLabel;

    @Column(name = "resource_url", length = 2048)
    private String resourceUrl;

    @Column(length = 500)
    private String tags;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    public enum Audience {
        TEACHER,
        STUDENT
    }

    public enum ResourceType {
        STUDY_PDF,
        TEACHER_VIDEO,
        TEACHER_GUIDE,
        STUDENT_VIDEO,
        STUDENT_EXERCISE,
        BRAIN_MODULE
    }
}
