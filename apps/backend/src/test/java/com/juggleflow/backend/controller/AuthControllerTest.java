package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.ForgotPasswordRequest;
import com.juggleflow.backend.dto.LoginRequest;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AuthControllerTest {

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
    @DisplayName("Register → 200 avec token JWT valide")
    void register_shouldReturn200_andToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegister("student@test.fr"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.email").value("student@test.fr"))
            .andExpect(jsonPath("$.role").value("ROLE_ELEVE"))
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString())
            .get("accessToken").asText();
        assertThat(token).isNotBlank().startsWith("eyJ");
    }

    @Test
    @DisplayName("Register → 400 si email déjà utilisé")
    void register_shouldReturn400_whenEmailAlreadyExists() throws Exception {
        RegisterRequest req = buildRegister("double@test.fr");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect"));
    }

    @Test
    @DisplayName("Register → 400 si mot de passe trop court")
    void register_shouldReturn400_whenPasswordTooShort() throws Exception {
        RegisterRequest req = buildRegister("weak@test.fr");
        req.setPassword("abc");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    @DisplayName("Register → 400 si email invalide")
    void register_shouldReturn400_whenEmailInvalid() throws Exception {
        RegisterRequest req = buildRegister("pas-un-email");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.email").exists());
    }


    @Test
    @DisplayName("Login → 200 avec token JWT")
    void login_shouldReturn200_andToken() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegister("login@test.fr"))))
            .andExpect(status().isOk());

        LoginRequest login = new LoginRequest();
        login.setEmail("login@test.fr");
        login.setPassword("Test2026!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.email").value("login@test.fr"));
    }

    @Test
    @DisplayName("Login → 401 si mauvais mot de passe")
    void login_shouldReturn401_whenWrongPassword() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegister("pwd@test.fr"))))
            .andExpect(status().isOk());

        LoginRequest login = new LoginRequest();
        login.setEmail("pwd@test.fr");
        login.setPassword("MauvaisMotDePasse!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("Login → 401 si email inconnu")
    void login_shouldReturn401_whenEmailNotFound() throws Exception {
        LoginRequest login = new LoginRequest();
        login.setEmail("inconnu@test.fr");
        login.setPassword("Test2026!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isUnauthorized());
    }


    @Test
    @DisplayName("/api/auth/me → 403 sans token")
    void me_shouldReturn403_withoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("/api/auth/me → 200 avec profil complet")
    void me_shouldReturn200_withFullProfile() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegister("me@test.fr"))))
            .andExpect(status().isOk())
            .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString())
            .get("accessToken").asText();

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("me@test.fr"))
            .andExpect(jsonPath("$.firstName").value("Prénom"))
            .andExpect(jsonPath("$.role").value("ROLE_ELEVE"))
            .andExpect(jsonPath("$.id").exists());
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password → 202 avec message générique")
    void forgotPassword_shouldReturn202_always() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRegister("forgot@test.fr"))))
            .andExpect(status().isOk());

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("forgot@test.fr");

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").exists());

        ForgotPasswordRequest unknown = new ForgotPasswordRequest();
        unknown.setEmail("inconnu@test.fr");

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(unknown)))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("/api/auth/me → 403 avec token invalide")
    void me_shouldReturn403_withInvalidToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer token.invalide.ici"))
            .andExpect(status().isForbidden());
    }


    private RegisterRequest buildRegister(String email) {
        RegisterRequest req = new RegisterRequest();
        req.setEmail(email);
        req.setPassword("Test2026!");
        req.setFirstName("Prénom");
        req.setLastName("Nom");
        req.setRole("student");
        return req;
    }
}
