package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    List<UserBadge> findByUser_IdOrderByUnlockedAtDesc(Long userId);
    boolean existsByUser_IdAndBadge_Id(Long userId, Long badgeId);

    @Query("SELECT ub.badge.id FROM UserBadge ub WHERE ub.user.id = :userId")
    Set<Long> findBadgeIdsByUserId(@Param("userId") Long userId);
}
