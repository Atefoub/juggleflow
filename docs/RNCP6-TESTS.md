# Stratégie de tests — JuggleFlow (RNCP6)

Document de synthèse pour le dossier professionnel : objectifs, périmètre et preuves d’exécution.

## Pyramide de tests

```text
                    ┌─────────────────┐
                    │  E2E Playwright │  Parcours utilisateur (navigateur)
                    └────────┬────────┘
              ┌──────────────┴──────────────┐
              │  Tests d’intégration API    │  Spring MockMvc + Redis (Testcontainers)
              └──────────────┬──────────────┘
        ┌────────────────────┴────────────────────┐
        │  Tests unitaires backend (JUnit)      │
        │  Tests unitaires frontend (Vitest)    │
        └─────────────────────────────────────┘
```

| Niveau | Outil | Ce que ça prouve |
|--------|--------|------------------|
| **Unitaire backend** | JUnit 5, Mockito | Règles métier (badges, streaks, JWT, handlers d’erreurs, contrôleurs isolés). |
| **Intégration sécurité** | Testcontainers Redis | Révocation JWT (JTI) et rate limiting distribués identiques en prod multi-instances. |
| **Unitaire frontend** | Vitest, Testing Library | Utilitaires (offline, parcours, onboarding), `ErrorBoundary`, composants ciblés. |
| **E2E** | Playwright (Chromium) | Chaîne complète navigateur → API → PostgreSQL : auth, rôles, RGPD admin, parcours enseignant. |

## Scénarios E2E (Playwright)

Répertoire : `apps/frontend/e2e/`

| Fichier | Scénario | Compte / données |
|---------|----------|------------------|
| `smoke.spec.ts` | Connexion enseignant → tableau de bord | `marie.dupont@ecole.fr` |
| `auth-session.spec.ts` | Refresh après rechargement ; logout + route protégée | Enseignant |
| `student-journey.spec.ts` | Connexion élève → dashboard (onboarding si besoin) | `lucas.martin@ecole.fr` |
| `admin-rgpd.spec.ts` | Admin → page RGPD, section consentements | `admin@juggleflow.local` |
| `teacher-journey.spec.ts` | Alerte blocage, export CSV, assignation parcours | Enseignant CE1 |
| `role-guard.spec.ts` | Redirection selon le rôle (élève / enseignant / admin) | Comptes démo |
| `z-rate-limit.spec.ts` | Trop de POST `/api/auth/login` → HTTP 429 | API seule (exécuté en dernier) |

Mot de passe démo : `Demo2026!` (`E2E_PASSWORD`). Admin CI : `Admin2026!` (`E2E_ADMIN_PASSWORD`).

## Exécution locale

**Prérequis** : PostgreSQL (+ Redis recommandé si `APP_*_STORE=redis`), backend avec bootstrap démo.

```bash
podman compose up -d postgres redis
podman compose up backend
# autre terminal, à la racine du monorepo
npx playwright install chromium
npm run e2e
```

Sous Docker Desktop, remplacez `podman compose` par `docker compose`.

Variables optionnelles : `E2E_PASSWORD`, `E2E_TEACHER_EMAIL`, `E2E_STUDENT_EMAIL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_BACKEND_URL`.

## CI (GitHub Actions)

Workflow : `.github/workflows/ci.yml`, job **E2E (Playwright)**.

- Services : PostgreSQL 17, Redis 7.
- Backend : `DEMO_BOOTSTRAP_ENABLED=true`, stores Redis pour JWT et rate limit.
- Frontend : `nx serve` via `playwright.config.mts`.
- Rapport HTML uploadé en artefact en cas d’échec.

## Couverture fonctionnelle visée (RNCP6)

- **Sécurité** : session (cookies refresh), rate limiting, révocation (tests backend Redis).
- **Multi-rôles** : élève, enseignant, administrateur.
- **RGPD** : accès à la console consentements parentaux.
- **Métier** : suivi de classe, alerte de blocage sur figure, export CSV, assignation de parcours.

## Limites connues

- Les E2E modifient parfois l’état (ex. assignation d’un parcours) ; les scénarios sont écrits pour être **ré-exécutables** (idempotence partielle).
- Le test rate limit (`z-*.spec.ts`) doit rester **en dernier** pour ne pas saturer le quota login (10/min/IP).
- Pas de test E2E PWA offline pour l’instant (file d’attente couverte en Vitest).

## Commandes utiles (dossier)

```bash
# Backend
cd apps/backend && ./mvnw test

# Frontend unitaire
npx nx test frontend

# E2E
npm run e2e

# E2E un fichier
npx playwright test --config=apps/frontend/playwright.config.mts apps/frontend/e2e/teacher-journey.spec.ts
```
