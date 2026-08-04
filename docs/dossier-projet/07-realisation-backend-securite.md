# 07 — Réalisation backend et sécurité

**Sources :** `apps/backend/src/main/java`, `pom.xml`, `application*.properties`, tests sécurité, `docs/screenshots/security/README.md`.

---

## 1. Stack backend

| Élément | Valeur | Preuve |
|---------|--------|--------|
| Spring Boot | 3.4.2 | `pom.xml` |
| Java | 21 | `pom.xml` |
| JJWT | 0.12.6 | `pom.xml` |
| Springdoc OpenAPI | 2.8.6 | `pom.xml` |
| Bucket4j | 8.10.1 | rate limit mémoire |
| OpenPDF | 3.0.3 | exports PDF RGPD |
| Lombok | 1.18.38 | `pom.xml` |

Dépendances BOM (versions non figées dans `pom.xml`) : Web, Data JPA, Security, Validation, Actuator, Redis, PostgreSQL driver, Flyway, Retry, Testcontainers.

---

## 2. API REST — inventaire des contrôleurs

17 contrôleurs sous `controller/` :

| Contrôleur | Base | Accès |
|------------|------|-------|
| `AuthController` | `/api/auth` | Public (login/register/forgot/refresh/logout) ; `/me` authentifié |
| `AdminController` | `/api/admin` | Admin |
| `AdminPedagogicalResourceController` | `/api/admin/resources` | Admin |
| `GdprController` | `/api/admin/gdpr` | Admin |
| `SchoolClassController` | `/api/enseignant/classes` | Teacher/Admin + ownership |
| `TeacherStudentController` | `/api/enseignant/students` | Teacher/Admin |
| `LearningPathController` | chemins mixtes `/api/learning-paths`, `/api/eleve/...`, `/api/enseignant/...` | Selon endpoint |
| `ProgressController` | `/api/progress` | Authentifié |
| `TrickController` | `/api/tricks` | Authentifié |
| `BadgeController` | `/api/badges` | Authentifié |
| `PedagogicalResourceController` | `/api/resources` | Authentifié |
| `JugglingLabController` | `/api/juggling-lab` | Public (redirect anim) |
| `DailyChallengeController` | `/api/eleve/daily-challenge` | Élève |
| `EleveOnboardingController` | `/api/eleve/onboarding` | Élève |
| `ElevePreferencesController` | `/api/eleve/preferences` | Élève |
| `EleveFavoriteController` | `/api/eleve/favorites` | Élève |
| `EleveBrainModuleController` | `/api/eleve/brain-module` | Élève |

---

## 3. Authentification JWT

Fichiers : `JwtUtils.java`, `JwtFilter.java`, `AuthService.java`, `CookieUtils.java`.

| Paramètre | Valeur par défaut / comportement |
|-----------|----------------------------------|
| Issuer | `juggleflow` |
| Access | claim `typ=access`, ~15 min |
| Refresh | claim `typ=refresh`, ~7 jours, cookie `refresh_token` |
| Cookie | HttpOnly, SameSite=Strict, Path `/api/auth`, Secure (obligatoire prod) |
| Clé | HMAC dérivée SHA-256 de `jwt.secret` (min 32 caractères) |
| JTI | UUID ; révocation Redis `jwt:revoked:jti:<JTI>` |
| Refresh | consommation atomique (anti-replay / rotation) |

Access token renvoyé en JSON ; refresh retiré du JSON et placé en cookie.

**Logout :** révoque le refresh (JTI) et clear cookie. Les access tokens non révoqués explicitement restent valides jusqu’à expiration courte.

---

## 4. Autorisation et rôles

Sous-classes :

- `Student` → `ROLE_ELEVE`
- `Teacher` → `ROLE_ENSEIGNANT`
- `Administrator` → `ROLE_ADMINISTRATEUR`

Règles globales (`SecurityConfig`) :

- `/api/admin/**` → administrateur ;
- `/api/enseignant/**`, `/api/classes/**` → enseignant ou admin ;
- méthodes élève annotées `@PreAuthorize("hasAuthority('ROLE_ELEVE')")` ;
- sessions Spring **stateless** ;
- CSRF désactivé (API token) ; mitigation cookie via SameSite=Strict.

Contrôle enseignant complémentaire : ownership de classe dans les services (`TeacherClassAccessService`).

---

## 5. Rate limiting

`RateLimitFilter` sur :

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/refresh`
- `/api/auth/forgot-password`

Quota : **10 requêtes / 60 s / IP** → HTTP 429 + `Retry-After`.

Stores : mémoire (Bucket4j, dev) ou Redis Lua (prod).  
`app.trusted-proxy=true` : IP via dernier `X-Forwarded-For` — dangereux sans reverse proxy contrôlé (commentaire code).

---

## 6. Headers et CORS

CORS : origines configurables (défaut `http://localhost:4200`), credentials on, wildcard `*` rejeté avec credentials.

Headers de sécurité : `X-Content-Type-Options`, frame deny, HSTS, Referrer-Policy, CSP, Permissions-Policy, COOP, CORP.

Mots de passe : **BCrypt strength 12**.

---

## 7. Garde-fous production

`ProdSafetyChecks` + `application-prod.properties` rejettent / forcent :

- secret JWT valide ;
- cookies Secure ;
- stores Redis pour révocation et rate limit ;
- pas de bootstrap démo ;
- pas de Swagger public ;
- pas d’inscription publique.

---

## 8. Composants métier clés (CP3)

| Service | Responsabilité |
|---------|----------------|
| `ProgressService` | Upsert progression, déclenche streak/badges |
| `LearningPathService` / `PathAssignmentResolver` | Assignations et parcours effectif |
| `StudentBlockageService` | Alertes blocage enseignant |
| `BadgeService` | Critères maîtrise / streak / temps pratique |
| `DailyChallengeService` | Rotation quotidienne |
| `GdprService` + exporters | Consentements, exports, disable élèves |
| `EstablishmentLicenseService` | Capacité de sièges |
| `AdminAuditService` | Journal actions sensibles |
| `ResourceStorageService` | Stockage fichiers pédagogiques |

---

## 9. RGPD (implémenté)

| Capacité | Statut |
|----------|--------|
| Types de consentement (`DATA_USAGE`, `COMMUNICATION`, `COOKIES`, `PARENTAL_MINOR`) | Oui |
| Statuts MISSING / VALID / REVOKED / EXPIRED | Oui |
| Durée défaut ~400 jours + version de politique | Oui |
| Gate parental sur auth élève | Oui |
| Exports registre CSV/PDF admin | Oui |
| Anonymisation annuelle 30/06 02:00 | Oui (email `@deleted.juggleflow.fr`, noms `[supprimé]`, disable, détache classe) |
| Droit d’accès / portabilité self-service utilisateur | **Non trouvé** |
| Suppression on-demand compte self-service | **Non trouvé** |

---

## 10. Bootstrap démo (soutenance)

`DemoBootstrapRunner` (si activé) : 3 enseignants, classes, 14 élèves, consentements, cas de blocage Lucas/Fontaine.  
`AdminBootstrapRunner` : admin idempotent si email/password fournis.  
**Interdit en production.**

---

## 11. Preuves sécurité documentées

Index : `docs/screenshots/security/README.md` (chaîne Security, JWT, Redis, RGPD, tests…).  
Régénération : `scripts/generate-security-screenshots.mjs` — exécution récente `[À COMPLÉTER / NON VÉRIFIÉ]`.

`[EXTRAIT CODE : SecurityConfig.java]`  
`[EXTRAIT CODE : JwtUtils.java]`  
`[EXTRAIT CODE : RateLimitFilter.java]`  
`[EXTRAIT CODE : ProdSafetyChecks.java]`
