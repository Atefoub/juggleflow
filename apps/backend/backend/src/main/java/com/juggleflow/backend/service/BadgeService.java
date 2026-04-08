package com.juggleflow.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.BadgeResponse;
import com.juggleflow.backend.model.Badge;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.model.UserBadge;
import com.juggleflow.backend.repository.BadgeRepository;
import com.juggleflow.backend.repository.UserBadgeRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BadgeService {

    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserProgressRepository progressRepository;
    private final ObjectMapper objectMapper;

    /**
     * Retourne tous les badges débloqués par l'utilisateur.
     */
    @Transactional(readOnly = true)
    public List<BadgeResponse> getUnlockedBadges(Long userId) {
        return userBadgeRepository.findByUser_IdOrderByUnlockedAtDesc(userId)
            .stream()
            .map(BadgeResponse::from)
            .toList();
    }

    /**
     * Retourne tous les badges disponibles (débloqués ou non).
     */
    @Transactional(readOnly = true)
    public List<BadgeResponse> getAllBadges() {
        return badgeRepository.findAllByOrderByDifficultyOrderAsc()
            .stream()
            .map(b -> BadgeResponse.builder()
                .id(b.getId())
                .name(b.getName())
                .description(b.getDescription())
                .iconUrl(b.getIconUrl())
                .experiencePoints(b.getExperiencePoints())
                .badgeTypeName(b.getBadgeType() != null ? b.getBadgeType().getName() : null)
                .unlocked(false)
                .build())
            .toList();
    }

    /**
     * Vérifie et débloque automatiquement les badges mérités.
     * Appelé après chaque mise à jour de progression.
     */
    @Transactional
    public void checkAndUnlockBadges(User user) {
        List<Badge> allBadges = badgeRepository.findAllByOrderByDifficultyOrderAsc();
        long masteredCount = progressRepository.countMasteredByUserId(user.getId());

        for (Badge badge : allBadges) {
            if (userBadgeRepository.existsByUser_IdAndBadge_Id(user.getId(), badge.getId())) {
                continue; // déjà débloqué
            }

            if (isBadgeEarned(badge, masteredCount)) {
                UserBadge userBadge = UserBadge.builder()
                    .user(user)
                    .badge(badge)
                    .notified(false)
                    .build();
                userBadgeRepository.save(userBadge);
                log.info("Badge '{}' débloqué pour l'utilisateur {}", badge.getName(), user.getEmail());
            }
        }
    }

    /**
     * Évalue si un badge est mérité selon ses critères JSON.
     * Format attendu : {"type":"tricks_mastered","count":5}
     */
    private boolean isBadgeEarned(Badge badge, long masteredCount) {
        try {
            JsonNode criteria = objectMapper.readTree(badge.getUnlockCriteria());
            String type = criteria.path("type").asText();

            return switch (type) {
                case "tricks_mastered" -> masteredCount >= criteria.path("count").asLong();
                default -> false;
            };
        } catch (Exception e) {
            log.warn("Critères de badge invalides pour '{}' : {}", badge.getName(), e.getMessage());
            return false;
        }
    }
}
