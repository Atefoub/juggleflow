package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "school_class",
    uniqueConstraints = @UniqueConstraint(columnNames = {"class_name", "school_year"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchoolClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "class_id")
    private Long id;

    @Column(name = "class_name", nullable = false, length = 100)
    private String name;

    @Column(name = "school_level", length = 10)
    private String schoolLevel;

    @Column(name = "school_year", nullable = false)
    private Integer schoolYear;

    @Column(name = "student_count")
    @Builder.Default
    private Integer studentCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "homeroom_teacher_id")
    private Teacher homeroomTeacher;
}
