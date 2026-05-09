package com.juggleflow.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminSetEnabledRequest {

  @NotNull(message = "enabled est obligatoire")
  private Boolean enabled;
}
