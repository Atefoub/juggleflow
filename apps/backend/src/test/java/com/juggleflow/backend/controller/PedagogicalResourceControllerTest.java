package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PedagogicalResourceControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /api/resources?audience=TEACHER → liste des ressources seed")
    void listTeacherResources() throws Exception {
        String token = registerAndGetToken("teacher-res@test.fr", "ROLE_ENSEIGNANT");

        mockMvc.perform(get("/api/resources")
                .param("audience", "TEACHER")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].title").exists())
            .andExpect(jsonPath("$[0].resourceType").exists());
    }

    @Test
    @DisplayName("POST /api/eleve/onboarding → persiste le niveau élève")
    void completeStudentOnboarding() throws Exception {
        String token = registerAndGetToken("onboard-api@test.fr", "ROLE_ELEVE");

        mockMvc.perform(post("/api/eleve/onboarding")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"level\":\"INTERMEDIATE\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jugglingLevel").value("INTERMEDIATE"))
            .andExpect(jsonPath("$.onboardingCompleted").value(true));
    }

    private String registerAndGetToken(String email, String role) throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setEmail(email);
        req.setPassword("Test2026!");
        req.setFirstName("Test");
        req.setLastName("User");
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
