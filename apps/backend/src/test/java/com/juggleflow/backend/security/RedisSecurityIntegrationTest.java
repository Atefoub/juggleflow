package com.juggleflow.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.ForgotPasswordRequest;
import com.juggleflow.backend.dto.LoginRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers
@SpringBootTest(properties = {
  "app.jwt.revocation.store=redis",
  "app.rate-limit.store=redis",
  "app.rate-limit.enabled=true",
  "app.rate-limit.max-requests=2",
  "app.rate-limit.window-seconds=60",
  "app.trusted-proxy=true"
})
@ActiveProfiles("test")
class RedisSecurityIntegrationTest {

  @Container
  static final GenericContainer<?> redisContainer = new GenericContainer<>(
    DockerImageName.parse("redis:7.4-alpine")
  ).withExposedPorts(6379);

  @DynamicPropertySource
  static void registerRedisProps(DynamicPropertyRegistry registry) {
    registry.add("spring.data.redis.host", redisContainer::getHost);
    registry.add("spring.data.redis.port", () -> redisContainer.getMappedPort(6379));
  }

  @Autowired private JwtUtils jwtUtils;
  @Autowired private StringRedisTemplate redis;
  @Autowired private WebApplicationContext context;
  @Autowired private ObjectMapper objectMapper;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders
      .webAppContextSetup(context)
      .apply(SecurityMockMvcConfigurers.springSecurity())
      .build();
    redis.getConnectionFactory().getConnection().serverCommands().flushAll();
  }

  @Test
  @DisplayName("JWT revocation (Redis) → un refresh token révoqué devient invalide")
  void jwtRevocationRedis_shouldInvalidateRefreshToken() {
    UserDetails user = User.withUsername("[email protected]")
      .password("hashed")
      .authorities("ROLE_ELEVE")
      .build();

    String refresh = jwtUtils.generateRefreshToken(user);
    assertThat(jwtUtils.isRefreshTokenValid(refresh, user)).isTrue();

    jwtUtils.revokeToken(refresh);

    assertThat(jwtUtils.isRefreshTokenValid(refresh, user)).isFalse();
  }

  @Test
  @DisplayName("Rate limit (Redis) + trusted proxy → compte par dernière IP X-Forwarded-For")
  void rateLimitRedis_shouldUseLastXForwardedForWhenTrustedProxy() throws Exception {
    LoginRequest req = new LoginRequest();
    req.setEmail("unknown@test.fr");
    req.setPassword("wrong-password");

    String json = objectMapper.writeValueAsString(req);

    // XFF last hop = 9.9.9.9 → 2 requêtes autorisées, 3e bloquée
    mockMvc.perform(post("/api/auth/login")
        .with(remoteAddr("10.0.0.1"))
        .header("X-Forwarded-For", "1.1.1.1, 9.9.9.9")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
      .andExpect(status().isUnauthorized());

    mockMvc.perform(post("/api/auth/login")
        .with(remoteAddr("10.0.0.2"))
        .header("X-Forwarded-For", "2.2.2.2, 9.9.9.9")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
      .andExpect(status().isUnauthorized());

    mockMvc.perform(post("/api/auth/login")
        .with(remoteAddr("10.0.0.3"))
        .header("X-Forwarded-For", "3.3.3.3, 9.9.9.9")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
      .andExpect(status().isTooManyRequests());

    // Nouvelle IP "visible" (last hop) → compteur séparé → pas rate limited
    mockMvc.perform(post("/api/auth/login")
        .with(remoteAddr("10.0.0.4"))
        .header("X-Forwarded-For", "4.4.4.4, 8.8.8.8")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json))
      .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Rate limit (Redis) → forgot-password partage le quota auth par IP")
  void rateLimitRedis_shouldApplyToForgotPassword() throws Exception {
    ForgotPasswordRequest req = new ForgotPasswordRequest();
    req.setEmail("probe@example.com");
    String json = objectMapper.writeValueAsString(req);

    for (int i = 0; i < 2; i++) {
      mockMvc.perform(post("/api/auth/forgot-password")
          .with(remoteAddr("10.0.0.1"))
          .header("X-Forwarded-For", "5.5.5.5, 7.7.7.7")
          .contentType(MediaType.APPLICATION_JSON)
          .content(json))
        .andExpect(status().isAccepted());
    }

    mockMvc.perform(post("/api/auth/forgot-password")
        .with(remoteAddr("10.0.0.2"))
        .header("X-Forwarded-For", "6.6.6.6, 7.7.7.7")
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

