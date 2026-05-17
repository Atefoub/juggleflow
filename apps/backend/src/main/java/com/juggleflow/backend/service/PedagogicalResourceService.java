package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.PedagogicalResourceResponse;
import com.juggleflow.backend.model.PedagogicalResource;
import com.juggleflow.backend.model.PedagogicalResource.Audience;
import com.juggleflow.backend.model.PedagogicalResource.ResourceType;
import com.juggleflow.backend.repository.PedagogicalResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PedagogicalResourceService {

    private final PedagogicalResourceRepository resourceRepository;

    public List<PedagogicalResourceResponse> list(
        Audience audience,
        ResourceType resourceType
    ) {
        List<PedagogicalResource> resources = resourceType == null
            ? resourceRepository.findByAudienceAndActiveTrueOrderBySortOrderAsc(audience)
            : resourceRepository.findByAudienceAndResourceTypeAndActiveTrueOrderBySortOrderAsc(
                audience, resourceType);

        return resources.stream()
            .map(PedagogicalResourceResponse::from)
            .toList();
    }
}
