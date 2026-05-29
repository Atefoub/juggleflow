package com.juggleflow.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@TestPropertySource(properties = {
  "app.auth.public-registration.enabled=false",
  "app.auth.public-registration.allow-teacher-role=false",
})
class AuthRegistrationSecurityTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @Test
  @DisplayName("register désactivé → 403")
  void register_whenDisabled_returns403() throws Exception {
    RegisterRequest req = new RegisterRequest();
    req.setEmail("blocked@test.fr");
    req.setPassword("Test2026!");
    req.setFirstName("A");
    req.setLastName("B");
    req.setRole("student");

    mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(req)))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.message").value("Inscription publique désactivée. Contactez votre établissement."));
  }
}
