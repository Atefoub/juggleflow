package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.UserStreak;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserStreakRepository extends JpaRepository<UserStreak, Long> {

    Optional<UserStreak> findByUserId(Long userId);
}
