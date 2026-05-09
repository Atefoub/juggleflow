package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.ConsentRequest;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.model.GdprConsent.ConsentType;
import com.juggleflow.backend.model.Administrator;
import com.juggleflow.backend.repository.AdminAuditEventRepository;
import com.juggleflow.backend.repository.GdprConsentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class GdprControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private GdprConsentRepository gdprConsentRepository;
    @Autowired private SchoolClassRepository schoolClassRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AdminAuditEventRepository adminAuditEventRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        adminAuditEventRepository.deleteAll();
        gdprConsentRepository.deleteAll();
        studentRepository.deleteAll();
        schoolClassRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("recordConsent → 400 si PARENTAL_MINOR sans legalGuardianId")
    void recordConsent_shouldReturn400_whenParentalConsentMissingGuardian() throws Exception {
        String adminToken = createAdminAndLogin("admin@gdpr.fr");

        String studentToken = registerAndGetToken("eleve@gdpr.fr", "student");
        Long studentId = getUserId(studentToken);

        ConsentRequest req = new ConsentRequest();
        req.setUserId(studentId);
        req.setConsentType(ConsentType.PARENTAL_MINOR);
        req.setConsentGiven(true);
        req.setPolicyVersion("v1.0");
        // legalGuardianId intentionnellement absent → doit lever une erreur de validation

        mockMvc.perform(post("/api/admin/gdpr/consents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").exists());
    }

    @Test
    @DisplayName("revokeParentalConsent → désactive le compte de l'élève")
    void revokeParentalConsent_shouldDisableUserAccount() throws Exception {
        String adminToken    = createAdminAndLogin("admin2@gdpr.fr");
        String guardianToken = createAdminAndLogin("guardian@gdpr.fr");
        String studentToken  = registerAndGetToken("eleve2@gdpr.fr", "student");

        Long studentId  = getUserId(studentToken);
        Long guardianId = getUserId(guardianToken);

        // Enregistrer un consentement parental valide
        ConsentRequest req = new ConsentRequest();
        req.setUserId(studentId);
        req.setConsentType(ConsentType.PARENTAL_MINOR);
        req.setConsentGiven(true);
        req.setPolicyVersion("v1.0");
        req.setLegalGuardianId(guardianId);

        mockMvc.perform(post("/api/admin/gdpr/consents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Révoquer le consentement parental
        mockMvc.perform(delete("/api/admin/gdpr/consents/"
                        + studentId + "/PARENTAL_MINOR")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // Vérifier que le compte est désactivé : login doit échouer avec 403
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"eleve2@gdpr.fr\",\"password\":\"Test2026!\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("exportRegister → 200 avec la liste complète des élèves de la classe")
    void exportRegister_shouldReturn200_withAllStudents() throws Exception {
        String teacherToken = registerAndGetToken("teacher@gdpr.fr", "teacher");
        String adminToken   = createAdminAndLogin("admin3@gdpr.fr");
        String studentToken = registerAndGetToken("eleve3@gdpr.fr", "student");

        Long classId   = createClass(teacherToken);
        Long studentId = getUserId(studentToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId
                        + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/admin/gdpr/classes/" + classId + "/consents/export")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].hasParentalConsent").value(false));
    }

    @Test
    @DisplayName("getConsentStatus → 403 si l'utilisateur n'est pas admin")
    void getConsentStatus_shouldReturn403_whenNotAdmin() throws Exception {
        String teacherToken = registerAndGetToken("teacher2@gdpr.fr", "teacher");
        Long classId = createClass(teacherToken);

        mockMvc.perform(get("/api/admin/gdpr/classes/" + classId + "/consents")
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
     * Crée un administrateur directement en base (l'inscription publique refuse
     * les rôles admin par design) puis récupère un access token via /login.
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

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("accessToken").asText();
    }

    private Long getUserId(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asLong();
    }

    private Long createClass(String teacherToken) throws Exception {
        SchoolClassRequest req = new SchoolClassRequest();
        req.setName("CE2 RGPD");
        req.setSchoolLevel("CE2");
        req.setSchoolYear(2026);

        MvcResult result = mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asLong();
    }
}