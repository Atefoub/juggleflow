package com.juggleflow.backend.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JugglingLabControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("anim → 302 vers une URL GIF Google Cloud Storage")
    void anim_shouldRedirectToGif() throws Exception {
        mockMvc.perform(get("/api/juggling-lab/anim")
                .param("pattern", "3")
                .param("width", "200")
                .param("height", "225")
                .param("slowdown", "2"))
            .andExpect(status().isFound())
            .andExpect(header().string("Location", containsString("storage.googleapis.com")))
            .andExpect(header().string("Location", containsString(".gif")));
    }
}
