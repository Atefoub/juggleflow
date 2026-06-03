package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.UserRepository;
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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SchoolClassRepository schoolClassRepository;

    @BeforeEach
    void setUp() {
        studentRepository.deleteAll();
        schoolClassRepository.deleteAll();
        userRepository.deleteAll();
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
    @DisplayName("lookup → 400 si classId absent")
    void lookup_shouldReturn400_whenClassIdMissing() throws Exception {
        String teacherToken = registerAndGetToken("teacher_lookup400@test.fr", "teacher");

        mockMvc.perform(get("/api/enseignant/students/lookup")
                .param("email", "eleve@test.fr")
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("lookup → 404 si e-mail inconnu")
    void lookup_shouldReturn404_whenEmailUnknown() throws Exception {
        String teacherToken = registerAndGetToken("teacher_lookup404@test.fr", "teacher");
        Long classId = createClassAndGetId(teacherToken);

        mockMvc.perform(get("/api/enseignant/students/lookup")
                .param("email", "inconnu@test.fr")
                .param("classId", String.valueOf(classId))
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("context → retourne classe et élève pour le titulaire")
    void context_shouldReturnClassAndStudent_whenOwner() throws Exception {
        String teacherToken = registerAndGetToken("teacher_ctx@test.fr", "teacher");
        Long classId = createClassAndGetId(teacherToken);
        registerAndGetToken("student_ctx@test.fr", "student");
        Long studentId = findStudentIdByEmail("student_ctx@test.fr");

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/students/" + studentId)
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/enseignant/students/" + studentId + "/context")
                .header("Authorization", "Bearer " + teacherToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.classId").value(classId.intValue()))
            .andExpect(jsonPath("$.student.id").value(studentId.intValue()));
    }

    @Test
    @DisplayName("context → 404 si l'enseignant n'est pas titulaire")
    void context_shouldReturn404_whenNotClassOwner() throws Exception {
        String ownerToken = registerAndGetToken("owner_ctx@test.fr", "teacher");
        String intruderToken = registerAndGetToken("intruder_ctx@test.fr", "teacher");
        Long classId = createClassAndGetId(ownerToken);
        registerAndGetToken("student_ctx_idor@test.fr", "student");
        Long studentId = findStudentIdByEmail("student_ctx_idor@test.fr");

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/students/" + studentId)
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/enseignant/students/" + studentId + "/context")
                .header("Authorization", "Bearer " + intruderToken))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("lookup → 404 si l'enseignant n'est pas titulaire de la classe")
    void lookup_shouldReturn404_whenNotClassOwner() throws Exception {
        String ownerToken = registerAndGetToken("owner_lookup@test.fr", "teacher");
        String intruderToken = registerAndGetToken("intruder_lookup@test.fr", "teacher");
        Long classId = createClassAndGetId(ownerToken);
        registerAndGetToken("student_lookup_idor@test.fr", "student");

        mockMvc.perform(get("/api/enseignant/students/lookup")
                .param("email", "student_lookup_idor@test.fr")
                .param("classId", String.valueOf(classId))
                .header("Authorization", "Bearer " + intruderToken))
            .andExpect(status().isNotFound());
    }

    private Long createClassAndGetId(String teacherToken) throws Exception {
        MvcResult classResult = mockMvc.perform(post("/api/enseignant/classes")
                .header("Authorization", "Bearer " + teacherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildClassRequest())))
            .andExpect(status().isCreated())
            .andReturn();
        return objectMapper.readTree(classResult.getResponse().getContentAsString()).get("id").asLong();
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

    private Long findStudentIdByEmail(String email) {
        return studentRepository.findByEmail(email)
            .orElseThrow()
            .getId();
    }

    private SchoolClassRequest buildClassRequest() {
        SchoolClassRequest req = new SchoolClassRequest();
        req.setName("CE2 — B");
        req.setSchoolLevel("CE2");
        req.setSchoolYear(2026);
        return req;
    }
}
