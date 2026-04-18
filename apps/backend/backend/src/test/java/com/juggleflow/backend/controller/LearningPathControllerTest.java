package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.AssignPathRequest;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.model.LearningPath;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.LearningPathRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import com.juggleflow.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LearningPathControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Autowired private UserRepository userRepository;
    @Autowired private LearningPathRepository learningPathRepository;
    @Autowired private ClassLearningPathRepository classLearningPathRepository;
    @Autowired private SchoolClassRepository schoolClassRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private TeacherRepository teacherRepository;

    @BeforeEach
    void setUp() {
        classLearningPathRepository.deleteAll();
        studentRepository.deleteAll();
        schoolClassRepository.deleteAll();
        learningPathRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("getAllPaths → filtre par niveau BEGINNER")
    void getAllPaths_shouldReturnFilteredByLevel() throws Exception {
        String token = registerAndGetToken("teacher@lp.fr", "teacher");

        learningPathRepository.save(buildPath("Fondamentaux", LearningPath.TargetLevel.BEGINNER));
        learningPathRepository.save(buildPath("Avancé", LearningPath.TargetLevel.ADVANCED));

        mockMvc.perform(get("/api/tricks/paths?level=BEGINNER")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].pathName").value("Fondamentaux"));
    }

    @Test
    @DisplayName("assignPath → 400 si le parcours est déjà assigné à la classe")
    void assignPath_shouldReturn400_whenAlreadyAssigned() throws Exception {
        String teacherToken = registerAndGetToken("teacher@assign.fr", "teacher");
        Long classId = createClass(teacherToken);
        LearningPath path = learningPathRepository.save(
                buildPath("Débutant", LearningPath.TargetLevel.BEGINNER));

        AssignPathRequest req = buildAssignRequest(path.getId(), classId);

        // Première assignation — doit réussir
        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Deuxième assignation — doit échouer
        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("assignPath → 403 si l'enseignant n'est pas titulaire de la classe")
    void assignPath_shouldReturn403_whenNotClassOwner() throws Exception {
        String ownerToken    = registerAndGetToken("owner@lp.fr",    "teacher");
        String intruderToken = registerAndGetToken("intruder@lp.fr", "teacher");

        Long classId = createClass(ownerToken);
        LearningPath path = learningPathRepository.save(
                buildPath("Intermédiaire", LearningPath.TargetLevel.INTERMEDIATE));

        AssignPathRequest req = buildAssignRequest(path.getId(), classId);

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
                        .header("Authorization", "Bearer " + intruderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("getStudentProgress → 200 avec pourcentage correct")
    void getStudentProgress_shouldReturn200_withCorrectPercentage() throws Exception {
        String teacherToken = registerAndGetToken("teacher@prog.fr", "teacher");
        Long classId = createClass(teacherToken);
        LearningPath path = learningPathRepository.save(
                buildPath("Progression", LearningPath.TargetLevel.BEGINNER));

        AssignPathRequest req = buildAssignRequest(path.getId(), classId);

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/enseignant/classes/" + classId
                        + "/paths/" + path.getId() + "/progress")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
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

    private Long createClass(String teacherToken) throws Exception {
        SchoolClassRequest req = new SchoolClassRequest();
        req.setName("CE1 B");
        req.setSchoolLevel("CE1");
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

    private LearningPath buildPath(String name, LearningPath.TargetLevel level) {
        return LearningPath.builder()
                .pathName(name)
                .description("Description " + name)
                .targetLevel(level)
                .estimatedDurationDays(30)
                .active(true)
                .build();
    }

    private AssignPathRequest buildAssignRequest(Long pathId, Long classId) {
        AssignPathRequest req = new AssignPathRequest();
        req.setLearningPathId(pathId);
        req.setClassId(classId);
        req.setStartDate(LocalDate.now());
        req.setExpectedEndDate(LocalDate.now().plusWeeks(6));
        return req;
    }
}
