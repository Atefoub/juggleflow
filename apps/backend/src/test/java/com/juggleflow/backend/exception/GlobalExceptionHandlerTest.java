package com.juggleflow.backend.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class GlobalExceptionHandlerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .webAppContextSetup(context)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Erreur de validation → JSON structuré avec fieldErrors")
    void validationError_shouldReturnStructuredJson() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("pas-un-email");
        req.setPassword("abc");
        // firstName et lastName manquants

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Validation échouée"))
            .andExpect(jsonPath("$.timestamp").exists())
            .andExpect(jsonPath("$.fieldErrors").isMap())
            .andExpect(jsonPath("$.fieldErrors.email").exists())
            .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    @DisplayName("Email déjà utilisé → 400 avec message métier")
    void duplicateEmail_shouldReturn400_withMessage() throws Exception {
        RegisterRequest req = buildRegister("dup@test.fr");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect"));
    }

    @Test
    @DisplayName("Violation UNIQUE email (course register) → 401 même message que existsByEmail")
    void duplicateEmailConstraint_shouldReturn401_withGenericMessage() {
        var handler = new GlobalExceptionHandler();
        var request = new MockHttpServletRequest();
        request.setRequestURI("/api/auth/register");

        var ex = new DataIntegrityViolationException(
            "could not execute statement [ERROR: duplicate key value violates unique constraint \"users_email_key\"]");

        var response = handler.handleDataIntegrityViolation(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("Email ou mot de passe incorrect");
    }

    @Test
    @DisplayName("Mauvais identifiants → 401 sans stacktrace")
    void badCredentials_shouldReturn401_withoutStacktrace() throws Exception {
        String body = """
            {"email":"inconnu@test.fr","password":"WrongPass1!"}
            """;

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.error").exists())
            // S'assurer qu'il n'y a pas de stacktrace Java exposée
            .andExpect(jsonPath("$.trace").doesNotExist())
            .andExpect(jsonPath("$.exception").doesNotExist());
    }

    private RegisterRequest buildRegister(String email) {
        RegisterRequest req = new RegisterRequest();
        req.setEmail(email);
        req.setPassword("Test2026!");
        req.setFirstName("Test");
        req.setLastName("User");
        req.setRole("student");
        return req;
    }
}
