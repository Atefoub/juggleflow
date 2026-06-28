package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.ForgotPasswordRequest;
import com.juggleflow.backend.dto.LoginRequest;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.model.GdprConsent;
import com.juggleflow.backend.model.GdprConsent.ConsentType;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "gdpr.enforce-parental-consent-on-auth=true")
class AuthControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private GdprConsentRepository gdprConsentRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .webAppContextSetup(context)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();
        gdprConsentRepository.deleteAll();
        userRepository.deleteAll();
    }


    @Test
    @DisplayName("Register enseignant → 200 avec token JWT valide")
    void register_shouldReturn200_andToken_forTeacher() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildTeacherRegister("teacher@test.fr"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.email").value("teacher@test.fr"))
            .andExpect(jsonPath("$.role").value("ROLE_ENSEIGNANT"))
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString())
            .get("accessToken").asText();
        assertThat(token).isNotBlank().startsWith("eyJ");
    }

    @Test
    @DisplayName("Register élève → 403 sans consentement parental")
    void register_shouldReturn403_forStudentWithoutParentalConsent() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildStudentRegister("student@test.fr"))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Consentement parental requis. Contactez votre établissement."));

        assertThat(userRepository.count()).isZero();
    }

    @Test
    @DisplayName("Register → 401 si email déjà utilisé")
    void register_shouldReturn401_whenEmailAlreadyExists() throws Exception {
        createStudentWithConsent("double@test.fr");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildStudentRegister("double@test.fr"))))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect"));
    }

    @Test
    @DisplayName("Register → 400 si mot de passe trop court")
    void register_shouldReturn400_whenPasswordTooShort() throws Exception {
        RegisterRequest req = buildStudentRegister("weak@test.fr");
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
        RegisterRequest req = buildStudentRegister("pas-un-email");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.email").exists());
    }


    @Test
    @DisplayName("Login élève → 200 avec consentement parental valide")
    void login_shouldReturn200_andToken() throws Exception {
        createStudentWithConsent("login@test.fr");

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
    @DisplayName("Login élève → 403 sans consentement parental")
    void login_shouldReturn403_whenParentalConsentMissing() throws Exception {
        userRepository.save(Student.builder()
            .email("noconsent@test.fr")
            .password(passwordEncoder.encode("Test2026!"))
            .firstName("Prénom")
            .lastName("Nom")
            .enabled(true)
            .build());

        LoginRequest login = new LoginRequest();
        login.setEmail("noconsent@test.fr");
        login.setPassword("Test2026!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Consentement parental requis. Contactez votre établissement."));
    }

    @Test
    @DisplayName("Login → 401 si mauvais mot de passe")
    void login_shouldReturn401_whenWrongPassword() throws Exception {
        createStudentWithConsent("pwd@test.fr");

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
        String token = loginAndGetToken("me@test.fr");

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
        createStudentWithConsent("forgot@test.fr");

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


    private RegisterRequest buildStudentRegister(String email) {
        RegisterRequest req = new RegisterRequest();
        req.setEmail(email);
        req.setPassword("Test2026!");
        req.setFirstName("Prénom");
        req.setLastName("Nom");
        req.setRole("student");
        return req;
    }

    private RegisterRequest buildTeacherRegister(String email) {
        RegisterRequest req = buildStudentRegister(email);
        req.setRole("ROLE_ENSEIGNANT");
        return req;
    }

    private Student createStudentWithConsent(String email) {
        Student student = userRepository.save(Student.builder()
            .email(email)
            .password(passwordEncoder.encode("Test2026!"))
            .firstName("Prénom")
            .lastName("Nom")
            .enabled(true)
            .build());
        grantParentalConsent(student);
        return student;
    }

    private void grantParentalConsent(Student student) {
        gdprConsentRepository.save(GdprConsent.builder()
            .user(student)
            .consentType(ConsentType.PARENTAL_MINOR)
            .consentGiven(true)
            .policyVersion("2026-1")
            .expiresAt(Instant.now().plus(400, ChronoUnit.DAYS))
            .build());
    }

    private String loginAndGetToken(String email) throws Exception {
        createStudentWithConsent(email);

        LoginRequest login = new LoginRequest();
        login.setEmail(email);
        login.setPassword("Test2026!");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
            .get("accessToken").asText();
    }
}
