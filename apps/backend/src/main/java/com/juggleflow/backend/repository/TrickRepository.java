package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.Trick;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TrickRepository extends JpaRepository<Trick, Long> {

  // findAll(Pageable) est hérité de JpaRepository — pas besoin de le redéclarer

  Page<Trick> findByLevel_Name(String levelName, Pageable pageable);

  Page<Trick> findByCategory_Id(Long categoryId, Pageable pageable);

  Page<Trick> findByNameContainingIgnoreCase(String name, Pageable pageable);

  List<Trick> findByPopularTrue();

  @Query("""
        SELECT t FROM Trick t
        WHERE t.level.progressionOrder <= (
            SELECT dl.progressionOrder FROM DifficultyLevel dl WHERE dl.name = :levelName
        )
        ORDER BY t.level.progressionOrder ASC, t.difficultyScore ASC
        """)
  List<Trick> findRecommendedForLevel(@Param("levelName") String levelName);
}
