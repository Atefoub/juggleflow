package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.Administrator;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdministratorRepository extends JpaRepository<Administrator, Long> {
}
