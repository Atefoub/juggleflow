package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {

    /**
     * Retourne toutes les classes dont le titulaire est l'enseignant identifié par son id.
     */
    List<SchoolClass> findByHomeroomTeacher_Id(Long teacherId);

    /**
     * Vérifie qu'une classe appartient bien à un enseignant donné.
     */
    boolean existsByIdAndHomeroomTeacher_Id(Long classId, Long teacherId);
}
