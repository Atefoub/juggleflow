package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.AdminAuditEventResponse;
import com.juggleflow.backend.model.AdminAuditEvent;
import com.juggleflow.backend.repository.AdminAuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private static final int MAX_DETAILS_LENGTH = 2000;
    private static final int MAX_LIMIT = 500;

    private final AdminAuditEventRepository adminAuditEventRepository;

    @Transactional
    public void record(String actorEmail, String action, String details) {
        if (!StringUtils.hasText(actorEmail)) {
            actorEmail = "unknown";
        }
        if (!StringUtils.hasText(action)) {
            action = "UNKNOWN";
        }
        String safeDetails = details != null && details.length() > MAX_DETAILS_LENGTH
            ? details.substring(0, MAX_DETAILS_LENGTH) + "…"
            : details;

        adminAuditEventRepository.save(AdminAuditEvent.builder()
            .occurredAt(Instant.now())
            .actorEmail(actorEmail.trim())
            .action(action.trim())
            .details(safeDetails)
            .build());
    }

    @Transactional(readOnly = true)
    public List<AdminAuditEventResponse> listRecent(int limit) {
        int cap = Math.min(Math.max(limit, 1), MAX_LIMIT);
        List<AdminAuditEvent> all = adminAuditEventRepository.findTop500ByOrderByOccurredAtDesc();
        return all.stream()
            .limit(cap)
            .map(AdminAuditEventResponse::from)
            .toList();
    }
}
