package com.juggleflow.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.LoginRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Couverture du store mémoire (dev / E2E CI). Le chemin Redis prod est dans
 * {@link RedisSecurityIntegrationTest}. Le 429 ne doit pas être prouvé via Playwright :
 * bcrypt + refill greedy + quota UI partagé rendent un hammer E2E flaky.
 */
@SpringBootTest(properties = {
  "app.jwt.revocation.store=memory",
  "app.rate-limit.store=memory",
  "app.rate-limit.enabled=true",
  "app.rate-limit.max-requests=2",
  "app.rate-limit.window-seconds=60",
  "app.trusted-proxy=true"
})
@ActiveProfiles("test")
class RateLimitMemoryIntegrationTest {

  @Autowired private WebApplicationContext context;
  @Autowired private ObjectMapper objectMapper;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders
      .webAppContextSetup(context)
      .apply(SecurityMockMvcConfigurers.springSecurity())
      .build();
  }

  @Test
  @DisplayName("Rate limit (memory) + trusted proxy → 3e login sur la même IP XFF → 429")
  void rateLimitMemory_shouldReturn429AfterQuota() throws Exception {
    LoginRequest req = new LoginRequest();
    req.setEmail("rate-limit-memory@test.fr");
    req.setPassword("wrong-password");
    String json = objectMapper.writeValueAsString(req);

    // IP dédiée à ce test (buckets mémoire persistants dans le contexte Spring)
    String xffIp = "203.0.113.50";

    mockMvc.perform(post("/api/auth/login")
        .with(remoteAddr("10.0.0.1"))
        .header("X-Forwarded-For", xffIp)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
      .andExpect(status().isUnauthorized());

    mockMvc.perform(post("/api/auth/login")
        .with(remoteAddr("10.0.0.1"))
        .header("X-Forwarded-For", xffIp)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
      .andExpect(status().isUnauthorized());

    mockMvc.perform(post("/api/auth/login")
        .with(remoteAddr("10.0.0.1"))
        .header("X-Forwarded-For", xffIp)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
      .andExpect(status().isTooManyRequests());
  }

  private static RequestPostProcessor remoteAddr(String ip) {
    return request -> {
      request.setRemoteAddr(ip);
      return request;
    };
  }
}
