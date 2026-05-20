package com.juggleflow.backend.support;

import com.juggleflow.backend.repository.EstablishmentSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.stereotype.Component;

/**
 * Réinitialise le singleton licence à chaque chargement de contexte Spring
 * (nouveau cache MockMvc, etc.) sur la même base Testcontainers.
 */
@Component
@Profile("test")
@RequiredArgsConstructor
public class EstablishmentSettingsContextReset implements ApplicationListener<ContextRefreshedEvent> {

    private final EstablishmentSettingsRepository establishmentSettingsRepository;

    @Override
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (event.getApplicationContext().getParent() != null) {
            return;
        }
        EstablishmentSettingsTestFixtures.resetToDefaults(establishmentSettingsRepository);
    }
}
