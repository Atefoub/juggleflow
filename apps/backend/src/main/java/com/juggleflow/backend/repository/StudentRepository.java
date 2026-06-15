package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {

    /**
     * Recherche un élève par email (champ porté par la table parent "users").
     * Utile pour retrouver la classe de l'élève connecté via son principal Spring Security.
     */
    Optional<Student> findByEmail(String email);

    /**
     * Retourne tous les élèves d'une classe donnée.
     */
    List<Student> findBySchoolClass_Id(Long classId);

    /**
     * Recherche un élève par son id utilisateur (héritage JOINED).
     */
    Optional<Student> findByIdAndSchoolClass_Id(Long studentId, Long classId);

    /**
     * Compte les élèves d'une classe.
     */
    int countBySchoolClass_Id(Long classId);

    /**
     * Export admin : récupère les élèves avec leur classe (fetch join) avec
     * filtre optionnel sur l'année scolaire.
     */
    @Query("""
        SELECT s
        FROM Student s
        JOIN FETCH s.schoolClass sc
        WHERE (:schoolYear IS NULL OR sc.schoolYear = :schoolYear)
        """)
    List<Student> findStudentsForProgressExport(@Param("schoolYear") Integer schoolYear);

    /**
     * Anonymise en masse les élèves d'une année scolaire (RGPD fin d'année).
     * Chaque ligne reçoit un email unique via gen_random_uuid() côté PostgreSQL.
     */
    @Modifying(clearAutomatically = true)
    @Query(value = """
        UPDATE users u
        SET email = gen_random_uuid()::text || '@deleted.juggleflow.fr',
            first_name = '[supprimé]',
            last_name = '[supprimé]',
            enabled = false
        FROM student s
        INNER JOIN school_class sc ON s.class_id = sc.class_id
        WHERE u.id = s.id
          AND sc.school_year = :schoolYear
        """, nativeQuery = true)
    int anonymizeUsersBySchoolYear(@Param("schoolYear") int schoolYear);

    /** Détache les élèves anonymisés de leur classe (complément de {@link #anonymizeUsersBySchoolYear}). */
    @Modifying(clearAutomatically = true)
    @Query(value = """
        UPDATE student s
        SET class_id = NULL
        FROM school_class sc
        WHERE s.class_id = sc.class_id
          AND sc.school_year = :schoolYear
        """, nativeQuery = true)
    int detachStudentsFromClassesBySchoolYear(@Param("schoolYear") int schoolYear);
}
