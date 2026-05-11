package com.juggleflow.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.juggleflow.backend.dto.RegisterRequest;
import com.juggleflow.backend.dto.SchoolClassRequest;
import com.juggleflow.backend.model.SchoolClass;
import com.juggleflow.backend.model.Student;
import com.juggleflow.backend.repository.SchoolClassRepository;
import com.juggleflow.backend.repository.StudentGroupRepository;
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

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests d'intégration des endpoints groupes pédagogiques (P2.7).
 * Couvre CRUD, drag-and-drop (reorder), gestion des membres et autorisation.
 */
@SpringBootTest
@ActiveProfiles("test")
class StudentGroupControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private SchoolClassRepository schoolClassRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private StudentGroupRepository groupRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        groupRepository.deleteAll();
        studentRepository.deleteAll();
        schoolClassRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("createGroup → 201 avec couleur et position 0 pour le premier groupe")
    void createGroup_shouldReturn201_andAssignPositionZero() throws Exception {
        String teacherToken = registerAndGetToken("prof_g1@test.fr", "teacher");
        Long classId = createClass(teacherToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/groups")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(groupBody("Equipe Lundi", "BLEU")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.classId").value(classId))
                .andExpect(jsonPath("$.name").value("Equipe Lundi"))
                .andExpect(jsonPath("$.color").value("BLEU"))
                .andExpect(jsonPath("$.position").value(0))
                .andExpect(jsonPath("$.memberCount").value(0));
    }

    @Test
    @DisplayName("createGroup → 409 si un groupe portant le meme nom existe deja dans la classe")
    void createGroup_shouldReturn409_whenNameDuplicate() throws Exception {
        String teacherToken = registerAndGetToken("prof_g2@test.fr", "teacher");
        Long classId = createClass(teacherToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/groups")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(groupBody("Duo", "VERT")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/groups")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(groupBody("Duo", "ROUGE")))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("createGroup → 404 si l'enseignant n'est pas titulaire de la classe")
    void createGroup_shouldReturn404_whenNotClassOwner() throws Exception {
        String ownerToken = registerAndGetToken("prof_owner@test.fr", "teacher");
        String intruderToken = registerAndGetToken("prof_intru@test.fr", "teacher");
        Long classId = createClass(ownerToken);

        mockMvc.perform(post("/api/enseignant/classes/" + classId + "/groups")
                        .header("Authorization", "Bearer " + intruderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(groupBody("Espion", "GRIS")))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("listGroups → renvoie les groupes ordonnés par position")
    void listGroups_shouldReturnOrderedByPosition() throws Exception {
        String teacherToken = registerAndGetToken("prof_list@test.fr", "teacher");
        Long classId = createClass(teacherToken);

        createGroup(teacherToken, classId, "Alpha", "BLEU");
        createGroup(teacherToken, classId, "Bravo", "VERT");
        createGroup(teacherToken, classId, "Charlie", "ROUGE");

        mockMvc.perform(get("/api/enseignant/classes/" + classId + "/groups")
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("Alpha"))
                .andExpect(jsonPath("$[1].name").value("Bravo"))
                .andExpect(jsonPath("$[2].name").value("Charlie"));
    }

    @Test
    @DisplayName("reorderGroups → met à jour les positions selon l'ordre fourni")
    void reorderGroups_shouldUpdatePositions() throws Exception {
        String teacherToken = registerAndGetToken("prof_reorder@test.fr", "teacher");
        Long classId = createClass(teacherToken);

        Long g1 = createGroup(teacherToken, classId, "G1", "BLEU");
        Long g2 = createGroup(teacherToken, classId, "G2", "VERT");
        Long g3 = createGroup(teacherToken, classId, "G3", "ROUGE");

        String body = objectMapper.writeValueAsString(
            java.util.Map.of("groupIds", List.of(g3, g1, g2)));

        mockMvc.perform(put("/api/enseignant/classes/" + classId + "/groups/reorder")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(g3))
                .andExpect(jsonPath("$[0].position").value(0))
                .andExpect(jsonPath("$[1].id").value(g1))
                .andExpect(jsonPath("$[1].position").value(1))
                .andExpect(jsonPath("$[2].id").value(g2))
                .andExpect(jsonPath("$[2].position").value(2));
    }

    @Test
    @DisplayName("setMembers → remplace integralement la liste des membres")
    void setMembers_shouldReplaceMembersList() throws Exception {
        String teacherToken = registerAndGetToken("prof_mem@test.fr", "teacher");
        Long classId = createClass(teacherToken);
        Long groupId = createGroup(teacherToken, classId, "Membres", "VIOLET");

        Long studentA = createStudentInClass("eleve_a@test.fr", classId);
        Long studentB = createStudentInClass("eleve_b@test.fr", classId);

        String body = objectMapper.writeValueAsString(
            java.util.Map.of("studentIds", List.of(studentA, studentB)));

        mockMvc.perform(put("/api/enseignant/classes/" + classId
                        + "/groups/" + groupId + "/members")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberCount").value(2))
                .andExpect(jsonPath("$.memberIds[0]").value(studentA))
                .andExpect(jsonPath("$.memberIds[1]").value(studentB));

        // Remplacement par un seul membre
        mockMvc.perform(put("/api/enseignant/classes/" + classId
                        + "/groups/" + groupId + "/members")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                            java.util.Map.of("studentIds", List.of(studentB)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberCount").value(1))
                .andExpect(jsonPath("$.memberIds[0]").value(studentB));
    }

    @Test
    @DisplayName("setMembers → 422 si un eleve n'appartient pas a la classe")
    void setMembers_shouldReturn422_whenStudentNotInClass() throws Exception {
        String teacherToken = registerAndGetToken("prof_alien@test.fr", "teacher");
        Long classId = createClass(teacherToken);
        Long groupId = createGroup(teacherToken, classId, "Eleves", "JAUNE");

        // Cree un eleve mais sans l'affecter a la classe
        registerAndGetToken("eleve_alien@test.fr", "student");
        Long alienId = userRepository.findByEmail("eleve_alien@test.fr").orElseThrow().getId();

        String body = objectMapper.writeValueAsString(
            java.util.Map.of("studentIds", List.of(alienId)));

        mockMvc.perform(put("/api/enseignant/classes/" + classId
                        + "/groups/" + groupId + "/members")
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("updateGroup → modifie le nom et la couleur")
    void updateGroup_shouldUpdateNameAndColor() throws Exception {
        String teacherToken = registerAndGetToken("prof_up@test.fr", "teacher");
        Long classId = createClass(teacherToken);
        Long groupId = createGroup(teacherToken, classId, "Initial", "BLEU");

        ObjectNode patchBody = objectMapper.createObjectNode();
        patchBody.put("name", "Renomme");
        patchBody.put("color", "ORANGE");

        mockMvc.perform(patch("/api/enseignant/classes/" + classId
                        + "/groups/" + groupId)
                        .header("Authorization", "Bearer " + teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patchBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renomme"))
                .andExpect(jsonPath("$.color").value("ORANGE"));
    }

    @Test
    @DisplayName("deleteGroup → 204 puis la liste se vide")
    void deleteGroup_shouldReturn204() throws Exception {
        String teacherToken = registerAndGetToken("prof_del@test.fr", "teacher");
        Long classId = createClass(teacherToken);
        Long groupId = createGroup(teacherToken, classId, "ASupprimer", "GRIS");

        mockMvc.perform(delete("/api/enseignant/classes/" + classId
                        + "/groups/" + groupId)
                        .header("Authorization", "Bearer " + teacherToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/enseignant/classes/" + classId + "/groups")
                        .header("Authorization", "Bearer " + teacherToken))
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
        req.setName("CE1 Groupes");
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

    private Long createGroup(String token, Long classId, String name, String color) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/enseignant/classes/" + classId + "/groups")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(groupBody(name, color)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asLong();
    }

    private String groupBody(String name, String color) throws Exception {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("name", name);
        body.put("color", color);
        return objectMapper.writeValueAsString(body);
    }

    /**
     * Crée un élève via /api/auth/register, puis l'attache à la classe en base
     * (les helpers MockMvc ne permettent pas d'attacher directement un élève
     * sans passer par un enseignant).
     */
    private Long createStudentInClass(String email, Long classId) throws Exception {
        registerAndGetToken(email, "student");
        SchoolClass cls = schoolClassRepository.findById(classId).orElseThrow();
        Student s = studentRepository.findByEmail(email).orElseThrow();
        s.setSchoolClass(cls);
        studentRepository.save(s);
        return s.getId();
    }
}
