package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.SchoolClassRequest;
import org.junit.jupiter.api.BeforeEach;
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
class TeacherStudentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // contexte partagé — emails uniques par test
    }

    @Test
    @DisplayName("lookup → trouve un élève par e-mail avec classe cible")
    void lookup_shouldReturnStudent_whenEmailExists() throws Exception {
        String teacherToken = registerAndGetToken("teacher_lookup@test.fr", "teacher");
        String studentEmail = "student_lookup@test.fr";
        registerAndGetToken(studentEmail, "student");

        MvcResult classResult = mockMvc.perform(post("/api/enseignant/classes")
                .header("Authorization", "Bearer " + teacherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildClassRequest())))
            .andExpect(status().isCreated())
            .andReturn();

        Long classId = objectMapper.readTree(
            classResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/enseignant/students/lookup")
                .param("email", studentEmail)
                .param("classId", String.valueOf(classId))
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(studentEmail))
            .andExpect(jsonPath("$.firstName").exists())
            .andExpect(jsonPath("$.alreadyInClass").value(false));
    }

    @Test
    @DisplayName("lookup → 404 si e-mail inconnu")
    void lookup_shouldReturn404_whenEmailUnknown() throws Exception {
        String teacherToken = registerAndGetToken("teacher_lookup404@test.fr", "teacher");

        mockMvc.perform(get("/api/enseignant/students/lookup")
                .param("email", "inconnu@test.fr")
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isNotFound());
    }

    private String registerAndGetToken(String email, String role) throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setEmail(email);
        req.setPassword("Test2026!");
        req.setFirstName("Prénom");
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

    private SchoolClassRequest buildClassRequest() {
        SchoolClassRequest req = new SchoolClassRequest();
        req.setName("CE2 — B");
        req.setSchoolLevel("CE2");
        req.setSchoolYear(2026);
        return req;
    }
}
