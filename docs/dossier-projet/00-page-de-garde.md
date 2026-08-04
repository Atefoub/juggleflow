# 00 — Page de garde

## Identification

| Champ | Valeur |
|-------|--------|
| **Nom de l’application** | JuggleFlow |
| **Sous-titre** | Apprendre et évoluer par le jonglage |
| **Nature** | Progressive Web App (PWA) pédagogique multi-rôles |
| **Contexte d’usage** | Établissements scolaires (élèves, enseignants, administrateurs) |
| **Certification** | RNCP6 — Concepteur développeur d’applications |
| **Type de livrable** | Dossier projet (base Markdown) |
| **Dépôt** | Monorepo Nx `juggleflow` |
| **Périmètre décrit** | État actuel du code (pas le MVP marketing du PDF) |

---

## Présentation courte

JuggleFlow est une plateforme web installable (PWA) qui structure l’apprentissage du jonglage en milieu scolaire : parcours progressifs, catalogue de figures (notation siteswap / animations Juggling Lab), suivi enseignant, gamification (badges, séries), et outils d’administration incluant la gestion des consentements parentaux (RGPD).

L’application expose trois espaces distincts selon le rôle Spring Security :

- `ROLE_ELEVE` — interface mobile-first sombre ;
- `ROLE_ENSEIGNANT` — suivi de classe et assignation de parcours ;
- `ROLE_ADMINISTRATEUR` — utilisateurs, classes, licence, RGPD, audit.

---

## Stack technique (constatée dans le dépôt)

| Couche | Technologie | Preuve |
|--------|-------------|--------|
| Monorepo | Nx 22.6.5 | `package.json`, `nx.json` |
| Frontend | React 19, TypeScript ~5.9, Vite 8, Tailwind CSS 4 | `package.json` |
| PWA | `vite-plugin-pwa` 1.3 + Workbox | `apps/frontend/vite.config.mts` |
| Backend | Spring Boot 3.4.2, Java 21 | `apps/backend/pom.xml` |
| Auth | JWT (JJWT 0.12.6) + cookie refresh httpOnly | `security/JwtUtils.java`, `CookieUtils.java` |
| BDD | PostgreSQL 17 (Compose), migrations Flyway | `docker-compose.yml`, `db/migration/` |
| Cache / sécurité distribuée | Redis 7.4 (révocation JWT, rate limiting) | `docker-compose.yml`, `RateLimitFilter.java` |
| Conteneurisation locale | **Podman** Compose (compatible Docker) | README, captures Podman |
| CI | GitHub Actions (lint, tests, build, E2E, CodeQL, TruffleHog, Trivy) | `.github/workflows/` |
| Déploiement avancé (artefacts) | Manifests Kubernetes dans `k8s/` | `k8s/README.md` |

---

## Environnement de démonstration locale

| Service | Image / runtime | Port hôte (dev) |
|---------|-----------------|-----------------|
| PostgreSQL | `postgres:17-alpine` | 5432 |
| Redis | `redis:7.4-alpine` | 6379 |
| Backend | `eclipse-temurin:21-jdk-jammy` (dev) ou image buildée (prod-like) | 8080 |
| Frontend | Node / Nx (`npx nx serve frontend`) — hors Compose | 4200 |

Preuves Podman : voir [09-environnement-podman.md](./09-environnement-podman.md) et dossier `captures/`.

---

## Documents sources associés

- PDF produit : `JuggleFlow-Apprendre-et-Evoluer-par-le-Jonglage.pdf`
- Analyse existante : `docs/analyse-projet/`
- Stratégie de tests : `docs/RNCP6-TESTS.md`
- Checklist production : `PRODUCTION_CHECKLIST.md`

---

## Avertissement méthodologique

Ce dossier **ne revendique pas** l’existence de fonctionnalités absentes du code.  
Le PDF produit décrit un MVP marketing plus restreint ; le code actuel est plus large. Les écarts sont listés dans [03-perimetre-fonctionnel.md](./03-perimetre-fonctionnel.md).
