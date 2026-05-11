package com.juggleflow.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/**
 * Groupe pédagogique nommé au sein d'une classe.
 * Orthogonal au {@code groupColor} calculé : un élève peut appartenir
 * à plusieurs groupes (cf. {@link #members}) et un groupe peut être
 * vide. L'ordre d'affichage est piloté par {@link #position} via le
 * drag-and-drop côté UI.
 */
@Entity
@Table(name = "student_group",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_student_group_name_per_class",
        columnNames = {"class_id", "name"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_id", nullable = false)
    private SchoolClass schoolClass;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private GroupColor color = GroupColor.BLEU;

    @Column(nullable = false)
    @Builder.Default
    private int position = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "student_group_membership",
        joinColumns = @JoinColumn(name = "group_id"),
        inverseJoinColumns = @JoinColumn(name = "student_id"))
    @Builder.Default
    private Set<Student> members = new HashSet<>();

    /** Palette de couleurs disponible côté UI. Synchronisé avec le CHECK de la table. */
    public enum GroupColor {
        VERT, ORANGE, ROUGE, BLEU, VIOLET, JAUNE, GRIS
    }
}
