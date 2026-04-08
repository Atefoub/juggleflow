// filename: backend/src/main/java/com/juggleflow/backend/dto/ConsentStatusResponse.java
package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ConsentStatusResponse {

    private Long userId;
    private String firstName;
    private String lastName;
    private boolean hasParentalConsent;
    private Instant consentDate;
    private String policyVersion;
}
