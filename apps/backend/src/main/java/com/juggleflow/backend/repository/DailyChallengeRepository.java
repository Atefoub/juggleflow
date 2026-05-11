package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.DailyChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DailyChallengeRepository extends JpaRepository<DailyChallenge, Long> {

    long countByActiveTrue();

    Optional<DailyChallenge> findByRotationSlotAndActiveTrue(Integer rotationSlot);

    List<DailyChallenge> findByActiveTrueOrderByRotationSlotAsc();
}
