package com.juggleflow.backend.support;

import com.juggleflow.backend.repository.EstablishmentSettingsRepository;
import org.springframework.test.context.TestContext;
import org.springframework.test.context.TestExecutionListener;

/**
 * Restaure le quota licence avant chaque méthode de test (même contexte Spring partagé).
 */
public class EstablishmentSettingsTestExecutionListener implements TestExecutionListener {

    @Override
    public void beforeTestMethod(TestContext testContext) {
        if (!testContext.hasApplicationContext()) {
            return;
        }
        EstablishmentSettingsRepository repository = testContext.getApplicationContext()
            .getBean(EstablishmentSettingsRepository.class);
        EstablishmentSettingsTestFixtures.resetToDefaults(repository);
    }
}
