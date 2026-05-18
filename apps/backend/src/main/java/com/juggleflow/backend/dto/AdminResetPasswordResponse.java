package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminResetPasswordResponse {
    private long userId;
    private String email;
    private String generatedPassword;
}
