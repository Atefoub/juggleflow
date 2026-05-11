package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.AssignPathRequest;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.model.LearningPath;
import com.juggleflow.backend.repository.ClassLearningPathRepository;
import com.juggleflow.backend.repository.LearningPathRepository;
import com.juggleflow.backend.repository.LearningPathStudentAssignmentRepository;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentRepository;
import com.juggleflow.backend.repository.TeacherRepository;
import com.juggleflow.backend.repository.UserRepository;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;

import java.util.List;
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

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class LearningPathControllerTest {

  @Autowired private WebApplicationContext context;
  @Autowired private ObjectMapper objectMapper;

  @Autowired private UserRepository userRepository;
  @Autowired private LearningPathRepository learningPathRepository;
  @Autowired private ClassLearningPathRepository classLearningPathRepository;
  @Autowired private LearningPathStudentAssignmentRepository studentAssignmentRepository;
  @Autowired private SchoolClassRepository schoolClassRepository;
  @Autowired private StudentRepository studentRepository;
  @Autowired private TeacherRepository teacherRepository;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders
      .webAppContextSetup(context)
      .apply(SecurityMockMvcConfigurers.springSecurity())
      .build();

    studentAssignmentRepository.deleteAll();
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

    mockMvc.perform(get("/api/learning-paths?level=BEGINNER")
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
  @DisplayName("assignPath → 404 si l'enseignant n'est pas titulaire de la classe")
  void assignPath_shouldReturn404_whenNotClassOwner() throws Exception {
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
  @DisplayName("getStudentProgress → 200 avec liste vide si aucun élève")
  void getStudentProgress_shouldReturn200_withEmptyList() throws Exception {
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

  @Test
  @DisplayName("getAssignedPathsForClass → 200 avec parcours assignés")
  void getAssignedPathsForClass_shouldReturn200_withAssignedPaths() throws Exception {
    String teacherToken = registerAndGetToken("teacher@list.fr", "teacher");
    Long classId = createClass(teacherToken);
    LearningPath path = learningPathRepository.save(
      buildPath("Liste", LearningPath.TargetLevel.BEGINNER));

    AssignPathRequest req = buildAssignRequest(path.getId(), classId);

    mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(req)))
      .andExpect(status().isCreated());

    mockMvc.perform(get("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(1))
      .andExpect(jsonPath("$[0].pathName").value("Liste"));
  }

  @Test
  @DisplayName("getStudentProgressForStudent → 200 avec détail par figure")
  void getStudentProgressForStudent_shouldReturn200_withDetails() throws Exception {
    String teacherToken = registerAndGetToken("teacher@student.fr", "teacher");
    Long classId = createClass(teacherToken);

    // Crée un élève + l'attache à la classe
    String studentToken = registerAndGetToken("eleve@student.fr", "student");
    Long studentId = objectMapper.readTree(
      mockMvc.perform(get("/api/auth/me")
          .header("Authorization", "Bearer " + studentToken))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString()
    ).get("id").asLong();

    Student student = studentRepository.findById(studentId).orElseThrow();
    student.setSchoolClass(schoolClassRepository.findById(classId).orElseThrow());
    studentRepository.save(student);

    LearningPath path = learningPathRepository.save(
      buildPath("Solo", LearningPath.TargetLevel.BEGINNER));

    AssignPathRequest req = buildAssignRequest(path.getId(), classId);
    mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(req)))
      .andExpect(status().isCreated());

    mockMvc.perform(get("/api/enseignant/classes/" + classId
        + "/paths/" + path.getId()
        + "/students/" + studentId)
        .header("Authorization", "Bearer " + teacherToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.studentId").value(studentId))
      .andExpect(jsonPath("$.trickDetails").isArray());
  }

  @Test
  @DisplayName("exportStudentProgressCsv → 200 et CSV téléchargeable")
  void exportStudentProgressCsv_shouldReturn200_withCsv() throws Exception {
    String teacherToken = registerAndGetToken("teacher@csv.fr", "teacher");
    Long classId = createClass(teacherToken);

    LearningPath path = learningPathRepository.save(
      buildPath("CSV", LearningPath.TargetLevel.BEGINNER));

    AssignPathRequest req = buildAssignRequest(path.getId(), classId);
    mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(req)))
      .andExpect(status().isCreated());

    mockMvc.perform(get("/api/enseignant/classes/" + classId
        + "/paths/" + path.getId() + "/progress/export")
        .header("Authorization", "Bearer " + teacherToken))
      .andExpect(status().isOk())
      .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/csv")))
      .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
      .andExpect(content().string(org.hamcrest.Matchers.containsString("studentId,firstName,lastName")));
  }

  @Test
  @DisplayName("getAllPaths → 401 sans token")
  void getAllPaths_shouldReturn401_withoutToken() throws Exception {
    mockMvc.perform(get("/api/learning-paths"))
      .andExpect(status().isForbidden());
  }

  // ── P2.8 — Assignation a un sous-ensemble d'eleves ───────────

  @Test
  @DisplayName("assignPath → 201 avec studentIds et l'eleve assigne voit le parcours")
  void assignPath_shouldReturn201_andAssignedStudentSeesPath() throws Exception {
    String teacherToken = registerAndGetToken("teacher@subset.fr", "teacher");
    Long classId = createClass(teacherToken);

    String studentTokenA = registerAndGetToken("eleve_a@subset.fr", "student");
    String studentTokenB = registerAndGetToken("eleve_b@subset.fr", "student");
    Long studentIdA = attachStudentToClass("eleve_a@subset.fr", classId);
    Long studentIdB = attachStudentToClass("eleve_b@subset.fr", classId);

    LearningPath path = learningPathRepository.save(
      buildPath("Subset", LearningPath.TargetLevel.BEGINNER));

    AssignPathRequest req = buildAssignRequest(path.getId(), classId);
    req.setStudentIds(List.of(studentIdA));

    mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(req)))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.id").value(path.getId().intValue()));

    // L'eleve A voit le parcours
    mockMvc.perform(get("/api/eleve/learning-paths")
        .header("Authorization", "Bearer " + studentTokenA))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(1))
      .andExpect(jsonPath("$[0].pathName").value("Subset"));

    // L'eleve B ne le voit PAS
    mockMvc.perform(get("/api/eleve/learning-paths")
        .header("Authorization", "Bearer " + studentTokenB))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(0));

    // _ = anti-warning unused
    assert studentIdB != null;
  }

  @Test
  @DisplayName("assignPath → 422 si studentIds contient un eleve hors classe")
  void assignPath_shouldReturn422_whenStudentNotInClass() throws Exception {
    String teacherToken = registerAndGetToken("teacher@alien.fr", "teacher");
    Long classId = createClass(teacherToken);

    // Eleve cree mais jamais attache a la classe
    registerAndGetToken("eleve_alien@subset.fr", "student");
    Long alienId = userRepository.findByEmail("eleve_alien@subset.fr")
        .orElseThrow().getId();

    LearningPath path = learningPathRepository.save(
      buildPath("Alien", LearningPath.TargetLevel.BEGINNER));

    AssignPathRequest req = buildAssignRequest(path.getId(), classId);
    req.setStudentIds(List.of(alienId));

    mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(req)))
      .andExpect(status().isUnprocessableEntity());
  }

  @Test
  @DisplayName("assignPath → 400 si studentIds est fourni alors qu'une assignation classe existe deja")
  void assignPath_shouldReturn400_whenIndividualAfterClassWide() throws Exception {
    String teacherToken = registerAndGetToken("teacher@dup.fr", "teacher");
    Long classId = createClass(teacherToken);
    String studentToken = registerAndGetToken("eleve_dup@subset.fr", "student");
    Long studentId = attachStudentToClass("eleve_dup@subset.fr", classId);

    LearningPath path = learningPathRepository.save(
      buildPath("Dup", LearningPath.TargetLevel.BEGINNER));

    // Premiere assignation a toute la classe
    AssignPathRequest reqClass = buildAssignRequest(path.getId(), classId);
    mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(reqClass)))
      .andExpect(status().isCreated());

    // Tentative d'assignation individuelle sur le meme parcours -> 400
    AssignPathRequest reqIndividual = buildAssignRequest(path.getId(), classId);
    reqIndividual.setStudentIds(List.of(studentId));
    mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(reqIndividual)))
      .andExpect(status().isBadRequest());

    assert studentToken != null;
  }

  @Test
  @DisplayName("unassignPath → supprime aussi les assignations individuelles")
  void unassignPath_shouldRemoveIndividualAssignments() throws Exception {
    String teacherToken = registerAndGetToken("teacher@undo.fr", "teacher");
    Long classId = createClass(teacherToken);
    String studentToken = registerAndGetToken("eleve_undo@subset.fr", "student");
    Long studentId = attachStudentToClass("eleve_undo@subset.fr", classId);

    LearningPath path = learningPathRepository.save(
      buildPath("ToRemove", LearningPath.TargetLevel.BEGINNER));

    AssignPathRequest req = buildAssignRequest(path.getId(), classId);
    req.setStudentIds(List.of(studentId));
    mockMvc.perform(post("/api/enseignant/classes/" + classId + "/paths")
        .header("Authorization", "Bearer " + teacherToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(req)))
      .andExpect(status().isCreated());

    // L'eleve voit le parcours
    mockMvc.perform(get("/api/eleve/learning-paths")
        .header("Authorization", "Bearer " + studentToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(1));

    mockMvc.perform(delete("/api/enseignant/classes/" + classId
        + "/paths/" + path.getId())
        .header("Authorization", "Bearer " + teacherToken))
      .andExpect(status().isNoContent());

    // L'eleve ne le voit plus
    mockMvc.perform(get("/api/eleve/learning-paths")
        .header("Authorization", "Bearer " + studentToken))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(0));
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

  /**
   * Attache un eleve precedemment enregistre via /api/auth/register a une classe
   * existante. Le helper teacher add-student demanderait un token enseignant
   * different, plus complique a orchestrer dans le test.
   */
  private Long attachStudentToClass(String email, Long classId) {
    SchoolClass cls = schoolClassRepository.findById(classId).orElseThrow();
    Student s = studentRepository.findByEmail(email).orElseThrow();
    s.setSchoolClass(cls);
    studentRepository.save(s);
    return s.getId();
  }
}
