package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.model.Administrator;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class AdminControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private SchoolClassRepository schoolClassRepository;
    @Autowired private UserProgressRepository userProgressRepository;
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
        userProgressRepository.deleteAll();
        studentRepository.deleteAll();
        schoolClassRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("GET /api/admin/progress/export → 200 + headers CSV + colonnes attendues (admin)")
    void exportProgressCsv_shouldReturn200_withCsvHeaders_whenAdmin() throws Exception {
        String adminToken = createAdminAndLogin("admin@export.fr");

        MvcResult res = mockMvc.perform(get("/api/admin/progress/export")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/csv")))
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
            .andReturn();

        String body = res.getResponse().getContentAsString();
        assertThat(body).isNotBlank();

        // Le CSV doit toujours contenir au minimum la ligne d'en-tête.
        assertThat(body).startsWith(String.join(",",
            "classId",
            "className",
            "schoolLevel",
            "schoolYear",
            "studentId",
            "firstName",
            "lastName",
            "totalTricks",
            "masteredTricks",
            "inProgressTricks",
            "completionPercent",
            "lastPracticeAt"
        ));
    }

    @Test
    @DisplayName("GET /api/admin/progress/export → 403 si l'utilisateur n'est pas admin")
    void exportProgressCsv_shouldReturn403_whenNotAdmin() throws Exception {
        String teacherToken = registerAndGetToken("teacher@export.fr", "teacher");

        mockMvc.perform(get("/api/admin/progress/export")
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isForbidden());
    }

    // ── Helpers ──────────────────────────────────────────────────

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

    /**
     * Crée un admin en base (le register public ne permet pas ROLE_ADMIN)
     * puis récupère un access token via /login.
     */
    private String createAdminAndLogin(String email) throws Exception {
        userRepository.save(Administrator.builder()
            .email(email)
            .password(passwordEncoder.encode("Test2026!"))
            .firstName("Admin")
            .lastName("Test")
            .enabled(true)
            .build());

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"Test2026!\"}"))
            .andExpect(status().isOk())
            .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString())
            .get("accessToken").asText();
        assertThat(token).isNotBlank();
        return token;
    }
}

