package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.UserFavoriteTrick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface UserFavoriteTrickRepository extends JpaRepository<UserFavoriteTrick, Long> {

    @Query("SELECT f.trick.id FROM UserFavoriteTrick f WHERE f.user.id = :userId ORDER BY f.createdAt DESC")
    List<Long> findTrickIdsByUserId(@Param("userId") Long userId);

    boolean existsByUser_IdAndTrick_Id(Long userId, Long trickId);

    Optional<UserFavoriteTrick> findByUser_IdAndTrick_Id(Long userId, Long trickId);

    @Query("SELECT f.trick.id FROM UserFavoriteTrick f WHERE f.user.id = :userId AND f.trick.id IN :trickIds")
    Set<Long> findFavoriteTrickIdsAmong(@Param("userId") Long userId, @Param("trickIds") List<Long> trickIds);
}
