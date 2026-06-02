package com.juggleflow.backend.support;

import com.juggleflow.backend.model.EstablishmentSettings;
import com.juggleflow.backend.repository.EstablishmentSettingsRepository;

import java.time.LocalDate;

/**
 * Valeurs Flyway V9 par défaut — réappliquées entre les tests pour éviter
 * qu'un test de quota licence (cap=1) ne casse register / DemoBootstrap.
 */
public final class EstablishmentSettingsTestFixtures {

    public static final int DEFAULT_SEAT_CAP = 60;
    /** Date lointaine pour éviter les 403 licence expirée en CI (horloge runner). */
    public static final LocalDate DEFAULT_LICENSE_EXPIRES = LocalDate.of(2099, 12, 31);
    public static final String DEFAULT_ESTABLISHMENT_NAME = "École Jules Ferry";

    private EstablishmentSettingsTestFixtures() {}

    public static void resetToDefaults(EstablishmentSettingsRepository repository) {
        repository.findById(1L).ifPresent(settings -> applyDefaults(settings, repository));
    }

    static void applyDefaults(EstablishmentSettings settings, EstablishmentSettingsRepository repository) {
        settings.setEstablishmentName(DEFAULT_ESTABLISHMENT_NAME);
        settings.setLicenseSeatCap(DEFAULT_SEAT_CAP);
        settings.setLicenseExpiresAt(DEFAULT_LICENSE_EXPIRES);
        repository.save(settings);
    }
}
