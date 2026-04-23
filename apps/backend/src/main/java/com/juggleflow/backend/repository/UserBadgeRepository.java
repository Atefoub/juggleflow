package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    List<UserBadge> findByUser_IdOrderByUnlockedAtDesc(Long userId);
    boolean existsByUser_IdAndBadge_Id(Long userId, Long badgeId);
}
