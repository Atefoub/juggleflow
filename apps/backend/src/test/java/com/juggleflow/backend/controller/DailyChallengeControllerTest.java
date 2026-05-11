package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.repository.DailyChallengeRepository;
import com.juggleflow.backend.repository.StudentRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class DailyChallengeControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private DailyChallengeRepository dailyChallengeRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .webAppContextSetup(context)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();

        studentRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("GET /api/eleve/daily-challenge → 200 + payload non vide pour un eleve")
    void getDailyChallenge_shouldReturn200_forStudent() throws Exception {
        String token = registerAndGetToken("daily@eleve.fr", "student");

        // Les 7 defis seedes en V5 doivent etre presents.
        assertThat(dailyChallengeRepository.countByActiveTrue())
            .as("Le seed V5 doit injecter au moins un defi actif")
            .isGreaterThan(0L);

        mockMvc.perform(get("/api/eleve/daily-challenge")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").isNotEmpty())
            .andExpect(jsonPath("$.description").isNotEmpty())
            .andExpect(jsonPath("$.rotationSlot").exists())
            .andExpect(jsonPath("$.date").exists());
    }

    @Test
    @DisplayName("GET /api/eleve/daily-challenge → 403 pour un enseignant")
    void getDailyChallenge_shouldReturn403_forTeacher() throws Exception {
        String token = registerAndGetToken("daily@prof.fr", "teacher");

        mockMvc.perform(get("/api/eleve/daily-challenge")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/eleve/daily-challenge → 403 sans token (route non publique)")
    void getDailyChallenge_shouldReturn403_withoutToken() throws Exception {
        mockMvc.perform(get("/api/eleve/daily-challenge"))
            .andExpect(status().isForbidden());
    }

    private String registerAndGetToken(String email, String role) throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setEmail(email);
        req.setPassword("Test2026!");
        req.setFirstName("Prenom");
        req.setLastName("Nom");
        req.setRole(role);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
            .get("accessToken").asText();
    }
}
