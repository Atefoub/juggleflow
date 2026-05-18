package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ForgotPasswordResponse {

    /**
     * Message générique affiché dans tous les cas (pas d'énumération d'emails).
     */
    private String message;
}
