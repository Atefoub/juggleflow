package com.juggleflow.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ProdSafetyChecksTest {

  private final ApplicationContextRunner runner = new ApplicationContextRunner()
    .withConfiguration(AutoConfigurations.of(
      org.springframework.boot.autoconfigure.context.PropertyPlaceholderAutoConfiguration.class
    ))
    .withUserConfiguration(ProdSafetyChecks.class);

  @Test
  @DisplayName("prod safety checks → démarre si config OK")
  void shouldStartWhenConfigOk() {
    runner
      .withPropertyValues(
        "spring.profiles.active=prod",
        "jwt.secret=TestSecretKeyTresLongueMinimum32CaractersPourLesTests2026!!",
        "cookie.secure=true",
        "demo.bootstrap.enabled=false",
        "springdoc.swagger-ui.enabled=false",
        "springdoc.api-docs.enabled=false",
        "app.jwt.revocation.store=redis",
        "app.rate-limit.store=redis"
      )
      .run(context -> assertThat(context).hasNotFailed());
  }

  @Test
  @DisplayName("prod safety checks → fail si demo bootstrap activé")
  void shouldFailWhenDemoBootstrapEnabled() {
    runner
      .withPropertyValues(
        "spring.profiles.active=prod",
        "jwt.secret=TestSecretKeyTresLongueMinimum32CaractersPourLesTests2026!!",
        "cookie.secure=true",
        "demo.bootstrap.enabled=true",
        "springdoc.swagger-ui.enabled=false",
        "springdoc.api-docs.enabled=false",
        "app.jwt.revocation.store=redis",
        "app.rate-limit.store=redis"
      )
      .run(context -> {
        assertThat(context).hasFailed();
        Throwable failure = context.getStartupFailure();
        assertThat(failure).isNotNull();

        Throwable root = failure;
        while (root.getCause() != null) {
          root = root.getCause();
        }

        assertThat(root)
          .hasMessageContaining("DEMO_BOOTSTRAP_ENABLED");
      });
  }
}

