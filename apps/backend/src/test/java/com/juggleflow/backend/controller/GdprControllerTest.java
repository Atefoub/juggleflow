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

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

    // ── Statut EXPIRED / VALID (P2.11) ───────────────────────────

    @Test
    @DisplayName("status=VALID quand le consentement utilise la policy_version courante")
    void status_shouldBeValid_whenPolicyVersionMatchesCurrent() throws Exception {
        String teacherToken = registerAndGetToken("teacher.valid@gdpr.fr", "teacher");
        String adminToken   = createAdminAndLogin("admin.valid@gdpr.fr");
        String studentToken = registerAndGetToken("eleve.valid@gdpr.fr", "student");
        String guardianToken = createAdminAndLogin("guardian.valid@gdpr.fr");

        Long classId    = createClass(teacherToken);
        Long studentId  = getUserId(studentToken);
        Long guardianId = getUserId(guardianToken);

        // L'eleve doit appartenir a la classe pour apparaitre dans le registre
        mockMvc.perform(post("/api/enseignant/classes/" + classId
                        + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        // policy_version aligne sur la valeur par defaut (gdpr.current-policy-version=2026-1)
        ConsentRequest req = new ConsentRequest();
        req.setUserId(studentId);
        req.setConsentType(ConsentType.PARENTAL_MINOR);
        req.setConsentGiven(true);
        req.setPolicyVersion("2026-1");
        req.setLegalGuardianId(guardianId);

        mockMvc.perform(post("/api/admin/gdpr/consents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VALID"))
                .andExpect(jsonPath("$.hasParentalConsent").value(true));
    }

    @Test
    @DisplayName("status=EXPIRED quand expiresAt est dans le passé")
    void status_shouldBeExpired_whenExpiresAtInPast() throws Exception {
        String teacherToken  = registerAndGetToken("teacher.exp@gdpr.fr", "teacher");
        String adminToken    = createAdminAndLogin("admin.exp@gdpr.fr");
        String studentToken  = registerAndGetToken("eleve.exp@gdpr.fr", "student");
        String guardianToken = createAdminAndLogin("guardian.exp@gdpr.fr");

        Long classId    = createClass(teacherToken);
        Long studentId  = getUserId(studentToken);
        Long guardianId = getUserId(guardianToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId
                        + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        ConsentRequest req = new ConsentRequest();
        req.setUserId(studentId);
        req.setConsentType(ConsentType.PARENTAL_MINOR);
        req.setConsentGiven(true);
        req.setPolicyVersion("2026-1");
        req.setLegalGuardianId(guardianId);
        req.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS));

        mockMvc.perform(post("/api/admin/gdpr/consents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRED"))
                .andExpect(jsonPath("$.hasParentalConsent").value(false));

        mockMvc.perform(get("/api/admin/gdpr/classes/" + classId + "/consents")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("EXPIRED"));
    }

    @Test
    @DisplayName("status=EXPIRED quand policy_version est obsolète (différente de la courante)")
    void status_shouldBeExpired_whenPolicyVersionStale() throws Exception {
        String teacherToken  = registerAndGetToken("teacher.stale@gdpr.fr", "teacher");
        String adminToken    = createAdminAndLogin("admin.stale@gdpr.fr");
        String studentToken  = registerAndGetToken("eleve.stale@gdpr.fr", "student");
        String guardianToken = createAdminAndLogin("guardian.stale@gdpr.fr");

        Long classId    = createClass(teacherToken);
        Long studentId  = getUserId(studentToken);
        Long guardianId = getUserId(guardianToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId
                        + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        ConsentRequest req = new ConsentRequest();
        req.setUserId(studentId);
        req.setConsentType(ConsentType.PARENTAL_MINOR);
        req.setConsentGiven(true);
        // Version intentionnellement obsolete par rapport au gdpr.current-policy-version=2026-1
        req.setPolicyVersion("2024-old");
        req.setLegalGuardianId(guardianId);

        mockMvc.perform(post("/api/admin/gdpr/consents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRED"));
    }

    // ── Export PDF du registre (P2.10) ───────────────────────────

    @Test
    @DisplayName("exportRegisterPdf → 200, content-type application/pdf et body commençant par %PDF-")
    void exportPdf_shouldReturn200_andApplicationPdf_whenAdmin() throws Exception {
        String teacherToken = registerAndGetToken("teacher.pdf@gdpr.fr", "teacher");
        String adminToken   = createAdminAndLogin("admin.pdf@gdpr.fr");
        String studentToken = registerAndGetToken("eleve.pdf@gdpr.fr", "student");

        Long classId   = createClass(teacherToken);
        Long studentId = getUserId(studentToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId
                        + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        MvcResult res = mockMvc.perform(
                        get("/api/admin/gdpr/classes/" + classId + "/consents/export.pdf")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type",
                    org.hamcrest.Matchers.containsString("application/pdf")))
                .andExpect(header().string("Content-Disposition",
                    org.hamcrest.Matchers.containsString("attachment")))
                .andReturn();

        byte[] body = res.getResponse().getContentAsByteArray();
        assertThat(body).isNotEmpty();
        // Tous les PDF, quelle que soit la version, commencent par les 5 octets "%PDF-".
        assertThat(new String(body, 0, 5)).isEqualTo("%PDF-");
    }

    @Test
    @DisplayName("exportRegisterPdf → 403 si l'utilisateur n'est pas admin")
    void exportPdf_shouldReturn403_whenNotAdmin() throws Exception {
        String teacherToken = registerAndGetToken("teacher.pdf2@gdpr.fr", "teacher");
        Long classId = createClass(teacherToken);

        mockMvc.perform(get("/api/admin/gdpr/classes/" + classId + "/consents/export.pdf")
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