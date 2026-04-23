// filename: backend/src/main/java/com/juggleflow/backend/repository/TeacherRepository.java
package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {

    /**
     * Recherche un enseignant par l'email de son compte utilisateur parent.
     */
    Optional<Teacher> findByEmail(String email);
}
