package com.juggleflow.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BrainModuleProgressResponse {

    private boolean started;
    private List<Integer> completedChapters;
}
