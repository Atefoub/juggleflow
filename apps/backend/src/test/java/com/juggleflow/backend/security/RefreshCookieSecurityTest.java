package com.juggleflow.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
  "cookie.secure=false",
  "jwt.refresh-expiration-ms=604800000"
})
@ActiveProfiles("test")
class RefreshCookieSecurityDevTest {

  @Autowired private WebApplicationContext context;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
    userRepository.deleteAll();
  }

  @Test
  @DisplayName("Register sets refresh cookie (dev) with httpOnly + SameSite=Strict + path=/api/auth and without Secure")
  void register_setsRefreshCookieAttributes_dev() throws Exception {
    RegisterRequest req = buildRegister("cookie-dev@test.fr");

    var result = mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(req)))
      .andExpect(status().isOk())
      .andReturn();

    var setCookies = result.getResponse().getHeaders("Set-Cookie");
    assertThat(setCookies).isNotEmpty();
    String setCookie = setCookies.getFirst();
    assertThat(setCookie).contains("refresh_token=");
    assertThat(setCookie).contains("Path=/api/auth");
    assertThat(setCookie).contains("HttpOnly");
    assertThat(setCookie).contains("SameSite=Strict");
    assertThat(setCookie).doesNotContain("Secure");
  }

  private static RegisterRequest buildRegister(String email) {
    RegisterRequest req = new RegisterRequest();
    req.setEmail(email);
    req.setPassword("Test2026!");
    req.setFirstName("Prenom");
    req.setLastName("Nom");
    req.setRole("student");
    return req;
  }
}

