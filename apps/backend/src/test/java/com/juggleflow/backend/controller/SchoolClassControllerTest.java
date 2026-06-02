package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.dto.TeacherCreateStudentRequest;
import com.juggleflow.backend.dto.UpdateStudentGroupRequest;
import com.juggleflow.backend.dto.StudentSummaryResponse;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentLearningPathRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class SchoolClassControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private SchoolClassRepository schoolClassRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private ClassLearningPathRepository classLearningPathRepository;
    @Autowired private StudentLearningPathRepository studentLearningPathRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        studentLearningPathRepository.deleteAll();
        classLearningPathRepository.deleteAll();
        studentRepository.deleteAll();
        schoolClassRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("createClass → 201 avec données valides pour un enseignant")
    void createClass_shouldReturn201_withValidData() throws Exception {
        String token = registerAndGetToken("teacher@test.fr", "teacher");

        mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildClassRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("CE1 — A"))
                .andExpect(jsonPath("$.schoolLevel").value("CE1"))
                .andExpect(jsonPath("$.schoolYear").value(2026));
    }

    @Test
    @DisplayName("createClass → 403 si l'utilisateur est un élève")
    void createClass_shouldReturn403_whenNotTeacher() throws Exception {
        String token = registerAndGetToken("eleve@test.fr", "student");

        mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildClassRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("getMyClasses → retourne uniquement les classes de l'enseignant connecté")
    void getMyClasses_shouldReturnOnlyOwnClasses() throws Exception {
        String tokenA = registerAndGetToken("teacher_a@test.fr", "teacher");
        String tokenB = registerAndGetToken("teacher_b@test.fr", "teacher");

        mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildClassRequest())))
                .andExpect(status().isCreated());

        // L'enseignant B ne doit voir aucune classe
        mockMvc.perform(get("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // L'enseignant A voit sa classe
        mockMvc.perform(get("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("addStudent → 400 si l'élève est déjà dans la classe")
    void addStudent_shouldReturn400_whenStudentAlreadyInClass() throws Exception {
        String teacherToken = registerAndGetToken("teacher_dup@test.fr", "teacher");
        String studentToken = registerAndGetToken("student_dup@test.fr", "student");

        MvcResult classResult = mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildClassRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        Long classId = objectMapper.readTree(
                classResult.getResponse().getContentAsString()).get("id").asLong();
        Long studentId = getStudentId(studentToken);

        // Premier ajout — OK
        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        // Deuxième ajout — doit échouer
        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("updateStudentGroup → assigne VERT puis réinitialise en AUTO")
    void updateStudentGroup_shouldAssignAndReset() throws Exception {
        String teacherToken = registerAndGetToken("teacher_grp@test.fr", "teacher");
        String studentToken = registerAndGetToken("student_grp@test.fr", "student");

        MvcResult classResult = mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildClassRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        Long classId = objectMapper.readTree(
                classResult.getResponse().getContentAsString()).get("id").asLong();
        Long studentId = getStudentId(studentToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        UpdateStudentGroupRequest assign = new UpdateStudentGroupRequest();
        assign.setGroupColor(StudentSummaryResponse.GroupColor.VERT);

        mockMvc.perform(patch("/api/enseignant/classes/" + classId
                        + "/students/" + studentId + "/group")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assign)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.groupColor").value("VERT"))
                .andExpect(jsonPath("$.groupColorManual").value(true));

        UpdateStudentGroupRequest reset = new UpdateStudentGroupRequest();
        reset.setGroupColor(null);

        mockMvc.perform(patch("/api/enseignant/classes/" + classId
                        + "/students/" + studentId + "/group")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reset)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.groupColorManual").value(false));
    }

    @Test
    @DisplayName("createStudentInClass → 201 et renvoie generatedPassword (enseignant)")
    void createStudentInClass_shouldReturn201_andGeneratedPassword() throws Exception {
        String teacherToken = registerAndGetToken("teacher_create_student@test.fr", "teacher");

        MvcResult classResult = mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildClassRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        Long classId = objectMapper.readTree(
                classResult.getResponse().getContentAsString()).get("id").asLong();

        TeacherCreateStudentRequest req = new TeacherCreateStudentRequest();
        req.setEmail("eleve.cree@test.fr");
        req.setFirstName("Eleve");
        req.setLastName("Cree");

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/students")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.classId").value(classId))
                .andExpect(jsonPath("$.generatedPassword").isNotEmpty());

        mockMvc.perform(get("/api/enseignant/classes/" + classId + "/students")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].firstName").value("Eleve"));
    }

    @Test
    @DisplayName("removeStudent → retire l'élève et met à jour le compteur")
    void removeStudent_shouldRemoveAndDecrementCount() throws Exception {
        String teacherToken = registerAndGetToken("teacher_rm@test.fr", "teacher");
        String studentToken = registerAndGetToken("student_rm@test.fr", "student");

        MvcResult classResult = mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildClassRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        Long classId = objectMapper.readTree(
                classResult.getResponse().getContentAsString()).get("id").asLong();
        Long studentId = getStudentId(studentToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/enseignant/classes/" + classId + "/students")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(delete("/api/enseignant/classes/" + classId + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/enseignant/classes/" + classId + "/students")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentCount").value(0));
    }

    @Test
    @DisplayName("deleteClass → 400 si la classe contient des élèves")
    void deleteClass_shouldReturn400_whenClassHasStudents() throws Exception {
        String teacherToken = registerAndGetToken("teacher_del@test.fr", "teacher");
        String studentToken = registerAndGetToken("student_del@test.fr", "student");

        MvcResult classResult = mockMvc.perform(post("/api/enseignant/classes")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildClassRequest())))
                .andExpect(status().isCreated())
                .andReturn();

        Long classId = objectMapper.readTree(
                classResult.getResponse().getContentAsString()).get("id").asLong();
        Long studentId = getStudentId(studentToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/students/" + studentId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isCreated());

        // Tenter de supprimer la classe — doit échouer
        mockMvc.perform(delete("/api/enseignant/classes/" + classId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
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

    private Long getStudentId(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asLong();
    }

    private SchoolClassRequest buildClassRequest() {
        SchoolClassRequest req = new SchoolClassRequest();
        req.setName("CE1 — A");
        req.setSchoolLevel("CE1");
        req.setSchoolYear(2026);
        return req;
    }
}
