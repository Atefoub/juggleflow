package com.juggleflow.backend.service;

import com.juggleflow.backend.dto.DailyChallengeResponse;
import com.juggleflow.backend.model.DailyChallenge;
import com.juggleflow.backend.repository.DailyChallengeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

/**
 * Selection deterministe du defi du jour :
 *   slot = abs(today.epochDay()) % count(active)
 *
 * Avantages :
 *   - tous les utilisateurs voient le meme defi le meme jour
 *   - aucun planificateur (cron) requis
 *   - retirer un defi de la rotation = passer {@code active=false}
 *   - testable trivialement en passant une LocalDate fixe
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DailyChallengeService {

    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Europe/Paris");

    private final DailyChallengeRepository dailyChallengeRepository;

    @Transactional(readOnly = true)
    public Optional<DailyChallengeResponse> getTodayChallenge() {
        return getChallengeForDate(LocalDate.now(DEFAULT_ZONE));
    }

    /**
     * Visible pour les tests : permet de fixer la date sans Clock injecte.
     */
    @Transactional(readOnly = true)
    public Optional<DailyChallengeResponse> getChallengeForDate(LocalDate date) {
        long activeCount = dailyChallengeRepository.countByActiveTrue();
        if (activeCount == 0) {
            return Optional.empty();
        }

        int slot = (int) Math.floorMod(date.toEpochDay(), activeCount);
        Optional<DailyChallenge> found =
            dailyChallengeRepository.findByRotationSlotAndActiveTrue(slot);

        if (found.isEmpty()) {
            // Slots non contigus : on tombe sur le premier actif >= slot, sinon le 1er global.
            log.debug("Aucun defi pour le slot {} (slots non-contigus), fallback ordre croissant", slot);
            return dailyChallengeRepository.findByActiveTrueOrderByRotationSlotAsc()
                .stream()
                .findFirst()
                .map(c -> DailyChallengeResponse.from(c, date));
        }

        return found.map(c -> DailyChallengeResponse.from(c, date));
    }
}
