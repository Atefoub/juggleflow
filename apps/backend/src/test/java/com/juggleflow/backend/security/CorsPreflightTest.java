package com.juggleflow.backend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.containsStringIgnoringCase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
  "cors.allowed-origins=http://localhost:4200",
  "cors.allowed-methods=GET,POST,OPTIONS",
  "cors.allowed-headers=Authorization,Content-Type,Accept",
  "cors.exposed-headers=Retry-After"
})
@ActiveProfiles("test")
class CorsPreflightTest {

  @Autowired private WebApplicationContext context;

  @Test
  @DisplayName("CORS preflight → allow origin + credentials + headers/methods")
  void preflight_shouldReturnCorsHeaders() throws Exception {
    MockMvc mockMvc = MockMvcBuilders
      .webAppContextSetup(context)
      .apply(SecurityMockMvcConfigurers.springSecurity())
      .build();

    mockMvc.perform(options("/api/auth/login")
        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Content-Type"))
      .andExpect(status().isOk())
      .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"))
      .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
      .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, containsString("POST")))
      .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsStringIgnoringCase("Content-Type")));
  }
}

