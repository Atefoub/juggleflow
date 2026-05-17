package com.juggleflow.backend.repository;

import com.juggleflow.backend.model.PedagogicalResource;
import com.juggleflow.backend.model.PedagogicalResource.Audience;
import com.juggleflow.backend.model.PedagogicalResource.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PedagogicalResourceRepository extends JpaRepository<PedagogicalResource, Long> {

    List<PedagogicalResource> findByAudienceAndActiveTrueOrderBySortOrderAsc(
        Audience audience
    );

    List<PedagogicalResource> findByAudienceAndResourceTypeAndActiveTrueOrderBySortOrderAsc(
        Audience audience,
        ResourceType resourceType
    );
}
