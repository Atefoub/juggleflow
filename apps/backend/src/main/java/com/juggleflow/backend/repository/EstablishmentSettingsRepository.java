package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.EstablishmentSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface EstablishmentSettingsRepository extends JpaRepository<EstablishmentSettings, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM EstablishmentSettings s WHERE s.id = :id")
    Optional<EstablishmentSettings> findByIdForUpdate(@Param("id") Long id);
}
