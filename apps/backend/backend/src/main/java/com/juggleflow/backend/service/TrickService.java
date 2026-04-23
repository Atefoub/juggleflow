package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.TrickResponse;
import com.juggleflow.backend.exception.ResourceNotFoundException;
import com.juggleflow.backend.model.Trick;
import com.juggleflow.backend.repository.TrickRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TrickService {

    private final TrickRepository trickRepository;

    /**
     * Liste paginée de toutes les figures, avec filtres optionnels.
     */
    public Page<TrickResponse> findAll(String levelName, Long categoryId,
                                        String search, Pageable pageable) {
        Page<Trick> page;

        if (search != null && !search.isBlank()) {
            page = trickRepository.findByNameContainingIgnoreCase(search.trim(), pageable);
        } else if (levelName != null && !levelName.isBlank()) {
            page = trickRepository.findByLevel_Name(levelName, pageable);
        } else if (categoryId != null) {
            page = trickRepository.findByCategory_Id(categoryId, pageable);
        } else {
            page = trickRepository.findAll(pageable);
        }

        return page.map(TrickResponse::from);
    }

    /**
     * Détail d'une figure par son id.
     */
    public TrickResponse findById(Long id) {
        Trick trick = trickRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Figure", id));
        return TrickResponse.from(trick);
    }

    /**
     * Figures recommandées pour un niveau donné.
     */
    public List<TrickResponse> findRecommended(String levelName) {
        return trickRepository.findRecommendedForLevel(levelName)
            .stream()
            .map(TrickResponse::from)
            .toList();
    }

    /**
     * Figures populaires (marquées popular=true en base).
     */
    public List<TrickResponse> findPopular() {
        return trickRepository.findByPopularTrue()
            .stream()
            .map(TrickResponse::from)
            .toList();
    }
}
