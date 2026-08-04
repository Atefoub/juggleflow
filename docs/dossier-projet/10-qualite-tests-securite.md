# 10 — Qualité, tests et sécurité applicative

**Sources :** `docs/RNCP6-TESTS.md`, arborescence `src/test`, `apps/frontend` Vitest/E2E, workflows GitHub Actions, `docs/screenshots/security/`.

**Compétence principale :** CP9 — Préparer et exécuter les plans de tests.

---

## 1. Pyramide de tests

```text
                    ┌─────────────────┐
                    │  E2E Playwright │
                    └────────┬────────┘
              ┌──────────────┴──────────────┐
              │  Intégration API + Redis TC │
              └──────────────┬──────────────┘
        ┌────────────────────┴────────────────────┐
        │  Unitaires JUnit  │  Unitaires Vitest   │
        └─────────────────────────────────────────┘
```

| Niveau | Outil | Preuve |
|--------|-------|--------|
| Unitaire backend | JUnit 5, Mockito | `apps/backend/src/test/java` (~27 classes) |
| Intégration sécurité | Testcontainers Redis | `RedisSecurityIntegrationTest` |
| Intégration API | `@SpringBootTest` + Postgres TC 16 | contrôleurs / services |
| Unitaire frontend | Vitest, Testing Library | ex. `OnboardingPage.test.tsx`, utils offline |
| E2E | Playwright Chromium | `apps/frontend/e2e/` |

---

## 2. Backend — domaines couverts

| Domaine | Exemples de classes de test |
|---------|-----------------------------|
| JWT / refresh / cookies | `JwtUtilsTest`, `RefreshCookieSecurityTest`, `RefreshCookieSecurityProdTest` |
| Redis révocation & rate limit | `RedisSecurityIntegrationTest` |
| CORS | `CorsPreflightTest` |
| Auth / register | `AuthControllerTest`, `AuthRegistrationSecurityTest` |
| Prod safety | `ProdSafetyChecksTest` |
| Admin / licence | `AdminControllerTest`, `EstablishmentLicenseServiceTest` |
| RGPD | `GdprControllerTest`, `GdprServiceStudentAccessTest` |
| Classes / élèves | `SchoolClassControllerTest`, `TeacherStudentControllerTest` |
| Parcours | `LearningPathControllerTest`, `LearningPathServiceTest` |
| Progression / badges / streak | `ProgressServiceTest`, `BadgeServiceTest`, `StreakServiceTest` |
| Favoris / cerveau / défi | contrôleurs `Eleve*` / `DailyChallenge*` |
| Erreurs | `GlobalExceptionHandlerTest` |

Exécution :

```bash
cd apps/backend && ./mvnw test
```

---

## 3. Frontend unitaire

```bash
npx nx test frontend
npx nx lint frontend
```

Couverture documentée : utilitaires offline, ErrorBoundary, composants / pages ciblés.

---

## 4. E2E Playwright

| Fichier | Scénario |
|---------|----------|
| `smoke.spec.ts` | Connexion enseignant → dashboard |
| `auth-session.spec.ts` | Refresh après reload ; logout |
| `student-journey.spec.ts` | Parcours élève / onboarding |
| `admin-rgpd.spec.ts` | Console consentements |
| `teacher-journey.spec.ts` | Blocage, CSV, assignation |
| `role-guard.spec.ts` | Redirections multi-rôles |
| `z-rate-limit.spec.ts` | HTTP 429 (exécuté en dernier) |

Prérequis : stack Podman + bootstrap démo (`docs/RNCP6-TESTS.md`).

```bash
npm run e2e
```

---

## 5. CI GitHub Actions

Workflow `.github/workflows/ci.yml` :

- lint / test / build frontend (Node 22) ;
- tests + JAR backend (Java 21) ;
- job E2E avec services PostgreSQL 17 + Redis 7.4.

Autres workflows sécurité :

| Workflow | Outil | Remarque |
|----------|-------|----------|
| `codeql.yml` | CodeQL Java + JS/TS | Hebdo + PR |
| `secret-scan.yml` | TruffleHog `--only-verified` | Historique git |
| `container-scan.yml` | Trivy CRITICAL | `continue-on-error: true` |
| `dependency-review.yml` | Dependency Review | PR, non bloquant |

**Statut vert actuel des pipelines :** `[À COMPLÉTER / NON VÉRIFIÉ]` (joindre captures Actions si disponibles).

---

## 6. Limites de la stratégie de tests (documentées)

- E2E parfois stateful ; idempotence partielle.
- Rate-limit E2E doit rester **dernier**.
- Pas d’E2E offline PWA (Vitest seulement pour la file).
- Trivy / dependency-review **non bloquants**.

---

## 7. Sécurité — preuves complémentaires

- Checklist : `PRODUCTION_CHECKLIST.md`
- Index captures générées : `docs/screenshots/security/README.md`
- Captures Podman TruffleHog / Ryuk : section 09

Plan de tests pour le dossier (tableau type) :

| ID | Cas | Type | Résultat attendu | Preuve |
|----|-----|------|------------------|--------|
| T-AUTH-01 | Login enseignant | E2E | Dashboard | `smoke.spec.ts` |
| T-AUTH-02 | Trop de login | E2E | 429 | `z-rate-limit.spec.ts` |
| T-SEC-01 | Refresh cookie Secure prod | IT | attributs cookie | `RefreshCookieSecurityProdTest` |
| T-SEC-02 | Révocation JTI Redis | IT | token rejeté | `RedisSecurityIntegrationTest` |
| T-RGPD-01 | Accès console admin | E2E | page consentements | `admin-rgpd.spec.ts` |
| T-MET-01 | Assignation parcours | E2E | parcours visible | `teacher-journey.spec.ts` |

Résultats chiffrés (nb tests, % couverture Sonar, etc.) : `[À COMPLÉTER]` après exécution locale / CI.
