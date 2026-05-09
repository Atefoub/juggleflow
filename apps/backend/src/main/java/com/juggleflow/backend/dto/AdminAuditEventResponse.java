package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.AdminAuditEvent;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class AdminAuditEventResponse {

    long id;
    Instant occurredAt;
    String actorEmail;
    String action;
    String details;

    public static AdminAuditEventResponse from(AdminAuditEvent e) {
        return AdminAuditEventResponse.builder()
            .id(e.getId())
            .occurredAt(e.getOccurredAt())
            .actorEmail(e.getActorEmail())
            .action(e.getAction())
            .details(e.getDetails())
            .build();
    }
}
