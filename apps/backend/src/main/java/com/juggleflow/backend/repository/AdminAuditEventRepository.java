package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.AdminAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminAuditEventRepository extends JpaRepository<AdminAuditEvent, Long> {

    List<AdminAuditEvent> findTop500ByOrderByOccurredAtDesc();
}
