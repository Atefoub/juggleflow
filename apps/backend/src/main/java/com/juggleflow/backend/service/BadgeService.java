package com.juggleflow.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.juggleflow.backend.dto.BadgeResponse;
import com.juggleflow.backend.model.Badge;
import com.juggleflow.backend.model.User;
import com.juggleflow.backend.model.UserBadge;
import com.juggleflow.backend.repository.BadgeRepository;
import com.juggleflow.backend.repository.PracticeSessionRepository;
import com.juggleflow.backend.repository.UserBadgeRepository;
import com.juggleflow.backend.repository.UserProgressRepository;
import com.juggleflow.backend.repository.UserStreakRepository;
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
    private final UserStreakRepository userStreakRepository;
    private final PracticeSessionRepository practiceSessionRepository;
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

        // Snapshot des metriques calculees une seule fois (vs. par badge dans la boucle).
        UserBadgeMetrics metrics = collectMetrics(user.getId());

        for (Badge badge : allBadges) {
            if (userBadgeRepository.existsByUser_IdAndBadge_Id(user.getId(), badge.getId())) {
                continue;
            }

            if (isBadgeEarned(badge, metrics)) {
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

    private UserBadgeMetrics collectMetrics(Long userId) {
        long mastered = progressRepository.countMasteredByUserId(userId);
        int currentStreak = userStreakRepository.findByUserId(userId)
            .map(s -> s.getCurrentStreakDays() == null ? 0 : s.getCurrentStreakDays())
            .orElse(0);
        long practiceMinutes = practiceSessionRepository.sumDurationSecondsByUserId(userId) / 60L;
        return new UserBadgeMetrics(mastered, currentStreak, practiceMinutes);
    }

    /**
     * Evalue si un badge est merite selon ses criteres JSON.
     * Formats supportes :
     *   {"type":"tricks_mastered","count":5}
     *   {"type":"consecutive_days","count":7}
     *   {"type":"practice_time","minutes":6000}
     *
     * Tout type inconnu retourne false (fail-closed) et est loggue.
     */
    private boolean isBadgeEarned(Badge badge, UserBadgeMetrics metrics) {
        try {
            JsonNode criteria = objectMapper.readTree(badge.getUnlockCriteria());
            String type = criteria.path("type").asText();

            return switch (type) {
                case "tricks_mastered" ->
                    metrics.masteredCount() >= criteria.path("count").asLong();
                case "consecutive_days" ->
                    metrics.currentStreakDays() >= criteria.path("count").asLong();
                case "practice_time" ->
                    metrics.totalPracticeMinutes() >= criteria.path("minutes").asLong();
                default -> {
                    log.warn("Type de critere de badge inconnu pour '{}' : '{}'",
                        badge.getName(), type);
                    yield false;
                }
            };
        } catch (Exception e) {
            log.warn("Critères de badge invalides pour '{}' : {}", badge.getName(), e.getMessage());
            return false;
        }
    }

    /**
     * Snapshot interne des metriques d'un utilisateur, evalue une fois par
     * appel a {@link #checkAndUnlockBadges(User)} pour eviter N requetes
     * SQL par badge.
     */
    private record UserBadgeMetrics(
        long masteredCount,
        long currentStreakDays,
        long totalPracticeMinutes
    ) {}
}
