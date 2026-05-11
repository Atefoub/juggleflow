package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.StudentGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentGroupRepository extends JpaRepository<StudentGroup, Long> {

    /**
     * Liste les groupes d'une classe, ordonnés par {@code position} puis par
     * date de création (les groupes nouvellement créés se mettent à la fin).
     * Les membres sont chargés via fetch join pour éviter le N+1.
     */
    @Query("""
        SELECT DISTINCT g
        FROM StudentGroup g
        LEFT JOIN FETCH g.members
        WHERE g.schoolClass.id = :classId
        ORDER BY g.position ASC, g.createdAt ASC
        """)
    List<StudentGroup> findBySchoolClass_IdWithMembers(@Param("classId") Long classId);

    Optional<StudentGroup> findByIdAndSchoolClass_Id(Long id, Long classId);

    boolean existsBySchoolClass_IdAndNameIgnoreCase(Long classId, String name);

    /** Plus haute position utilisée dans une classe (sert à pousser un nouveau groupe à la fin). */
    @Query("""
        SELECT COALESCE(MAX(g.position), -1)
        FROM StudentGroup g
        WHERE g.schoolClass.id = :classId
        """)
    int findMaxPositionForClass(@Param("classId") Long classId);
}
