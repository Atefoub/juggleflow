package com.juggleflow.backend.bootstrap;

import com.juggleflow.backend.model.Administrator;
import com.juggleflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

/**
 * Bootstrap conditionnel d'un compte ROLE_ADMINISTRATEUR au démarrage de l'application.
 *
 * L'endpoint public POST /api/auth/register refuse les rôles admin (AuthService) :
 * rétrograde toute valeur autre que ROLE_ENSEIGNANT/TEACHER vers Student. C'est la
 * bonne posture sécurité (anti-élévation de privilèges via l'API publique).
 *
 * Ce runner offre une voie alternative pour créer un admin SANS exposer d'endpoint
 * d'écriture, en respectant trois invariants :
 *
 *  1. INACTIF PAR DÉFAUT
 *     Si les deux propriétés (email, password) ne sont pas définies, le runner ne
 *     fait rien. Posture "sécurisé par défaut", alignée sur swagger.public,
 *     app.trusted-proxy, app.rate-limit.enabled, etc.
 *
 *  2. IDEMPOTENT
 *     Si un compte avec cet email existe déjà, le runner ne fait rien — ni doublon,
 *     ni écrasement silencieux du mot de passe d'un compte existant.
 *
 *  3. AUCUN SECRET DANS GIT
 *     Les valeurs sont injectées via environnement (ADMIN_BOOTSTRAP_EMAIL /
 *     ADMIN_BOOTSTRAP_PASSWORD), donc via le .env local (présent dans .gitignore).
 *     Le hash BCrypt n'est calculé qu'en mémoire au démarrage.
 *
 * USAGE (développement local)
 * ---------------------------
 * Dans apps/backend/.env :
 *   ADMIN_BOOTSTRAP_EMAIL=admin@juggleflow.local
 *   ADMIN_BOOTSTRAP_PASSWORD=Admin2026!
 *
 * Au démarrage, un Administrator est créé en base si l'email n'existe pas, puis on
 * se connecte via POST /api/auth/login avec ces identifiants.
 *
 * PRODUCTION
 * ----------
 * Ne définir aucune de ces variables d'env sur le pod prod. Les valeurs par défaut
 * sont vides → le bootstrap reste inactif. Un log WARN explicite est émis si quelqu'un
 * les définit malgré tout, pour que l'opérateur le voie au démarrage.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

  /**
   * Règles de complexité du mot de passe, alignées sur RegisterRequest.@Pattern :
   * au moins une minuscule, une majuscule, un chiffre. La longueur minimale est
   * vérifiée séparément (PASSWORD_MIN_LENGTH).
   *
   * On duplique volontairement la regex plutôt que de la factoriser : RegisterRequest
   * la déclare via une annotation @Pattern non triviale à extraire en constante
   * partagée, et la duplication est ici délibérée (1 fichier supplémentaire concerné).
   */
  private static final Pattern PASSWORD_COMPLEXITY =
    Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$");

  private static final int PASSWORD_MIN_LENGTH = 8;

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  @Value("${admin.bootstrap.email:}")
  private String bootstrapEmail;

  @Value("${admin.bootstrap.password:}")
  private String bootstrapPassword;

  @Value("${admin.bootstrap.first-name:Admin}")
  private String bootstrapFirstName;

  @Value("${admin.bootstrap.last-name:Bootstrap}")
  private String bootstrapLastName;

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (bootstrapEmail.isBlank() && bootstrapPassword.isBlank()) {
      log.info("AdminBootstrap : désactivé (admin.bootstrap.email/password non définis)");
      return;
    }

    if (bootstrapEmail.isBlank() || bootstrapPassword.isBlank()) {
      log.warn("AdminBootstrap : configuration partielle ignorée — "
        + "admin.bootstrap.email ET admin.bootstrap.password doivent être définis ensemble");
      return;
    }

    String email = bootstrapEmail.trim().toLowerCase();

    if (userRepository.existsByEmail(email)) {
      log.info("AdminBootstrap : compte {} déjà présent, aucune action", email);
      return;
    }

    if (bootstrapPassword.length() < PASSWORD_MIN_LENGTH
      || !PASSWORD_COMPLEXITY.matcher(bootstrapPassword).matches()) {
      log.error("AdminBootstrap : mot de passe non conforme "
        + "(>= {} caractères, au moins une minuscule, une majuscule, un chiffre) — "
        + "création abandonnée", PASSWORD_MIN_LENGTH);
      return;
    }

    Administrator admin = Administrator.builder()
      .email(email)
      .password(passwordEncoder.encode(bootstrapPassword))
      .firstName(bootstrapFirstName)
      .lastName(bootstrapLastName)
      .enabled(true)
      .build();

    userRepository.save(admin);

    log.warn("AdminBootstrap : compte ROLE_ADMINISTRATEUR créé pour {} — "
      + "À NE JAMAIS UTILISER EN PRODUCTION", email);
  }
}
