package com.juggleflow.backend.dto;

import com.juggleflow.backend.model.PedagogicalResource;
import lombok.Builder;
import lombok.Value;

import java.util.Arrays;
import java.util.List;

@Value
@Builder
public class PedagogicalResourceResponse {

    Long id;
    String audience;
    String resourceType;
    String title;
    String subtitle;
    String metaLabel;
    String resourceUrl;
    List<String> tags;

    public static PedagogicalResourceResponse from(PedagogicalResource resource) {
        return from(resource, resource.getResourceUrl());
    }

    public static PedagogicalResourceResponse from(
        PedagogicalResource resource,
        String effectiveUrl
    ) {
        List<String> tagList = resource.getTags() == null || resource.getTags().isBlank()
            ? List.of()
            : Arrays.stream(resource.getTags().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        return PedagogicalResourceResponse.builder()
            .id(resource.getId())
            .audience(resource.getAudience().name())
            .resourceType(resource.getResourceType().name())
            .title(resource.getTitle())
            .subtitle(resource.getSubtitle())
            .metaLabel(resource.getMetaLabel())
            .resourceUrl(effectiveUrl)
            .tags(tagList)
            .build();
    }
}
