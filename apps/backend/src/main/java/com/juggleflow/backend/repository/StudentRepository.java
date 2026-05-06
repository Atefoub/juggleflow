// filename: backend/src/main/java/com/juggleflow/backend/repository/StudentRepository.java
package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
