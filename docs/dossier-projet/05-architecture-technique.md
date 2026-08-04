# 05 — Architecture technique

**Sources :** README, `package.json`, `pom.xml`, structure `apps/`, `docker-compose.yml`, `k8s/`.

---

## 1. Vue d’ensemble

JuggleFlow est un **monorepo Nx** contenant :

```text
juggleflow/
├── apps/frontend/     # PWA React (Vite)
├── apps/backend/      # API Spring Boot (Maven)
├── docker-compose.yml # Dev Podman/Docker
├── compose.prod.yml   # Backend image immutable
├── k8s/               # Manifests Kubernetes (point de départ)
└── .github/workflows/ # CI + scans
```

Le frontend **n’est pas** conteneurisé dans Compose ni dans `k8s/` (servi via Node en local ; stratégie de hosting frontend en prod : `[À COMPLÉTER / NON VÉRIFIÉ]` hors éventuelle checklist).

---

## 2. Architecture applicative (C4 niveau logique)

```text
[Navigateur / PWA installée]
        │ HTTPS (prod) / HTTP (dev)
        ▼
[Frontend React :4200]
        │ REST JSON + cookie refresh
        ▼
[Backend Spring Boot :8080]
   ├── PostgreSQL :5432
   └── Redis :6379
```

En production-like Compose (`compose.prod.yml`) : Postgres/Redis **sans** ports exposés sur l’hôte ; seul le backend expose `:8080`.

---

## 3. Découpage backend (couches)

| Couche | Responsabilité | Exemple |
|--------|----------------|---------|
| Controller | HTTP, validation entrée, mapping DTO | `ProgressController` |
| Security | AuthN/AuthZ, rate limit | `JwtFilter`, `SecurityConfig` |
| Service | Règles métier, orchestration | `ProgressService`, `LearningPathService` |
| Repository | Persistance | `UserProgressRepository` |
| Model | Entités JPA | `UserProgress`, `Trick` |

Configuration notable (`application.properties`) :

- `spring.jpa.open-in-view=false`
- Hibernate `ddl-auto` / schéma en **validate** (Flyway fait autorité)
- Actuator health pour probes Compose/K8s

---

## 4. Découpage frontend

| Zone | Rôle |
|------|------|
| `pages/` | Écrans par rôle |
| `components/` | UI réutilisable + layouts |
| `api/` | Clients HTTP + wrappers offline |
| `context/` | Session (`AuthContext`) |
| `utils/` | Offline queue, IDB, thème, progress parcours |
| `router/AppRouter.tsx` | Routes lazy + garde de rôle |

État distant : TanStack React Query + Axios.

---

## 5. Sécurité transversale (aperçu)

Détail : [07-realisation-backend-securite.md](./07-realisation-backend-securite.md).

| Mécanisme | Implémentation |
|-----------|----------------|
| Authentification | JWT access (Bearer) + refresh cookie httpOnly |
| Autorisation | `hasAuthority` / antMatchers par préfixe |
| Rate limiting | 10 req / 60 s sur endpoints auth sensibles |
| Headers | CSP, HSTS, COOP/CORP, frame deny… |
| Prod fail-fast | `ProdSafetyChecks` (secret, cookies, Redis, pas de démo/Swagger/register public) |

---

## 6. Données

| Store | Usage |
|-------|-------|
| PostgreSQL | Données métier (utilisateurs, pédagogie, RGPD…) |
| Redis | Révocation JTI + compteurs rate limit (stores `redis` en prod) |
| IndexedDB (navigateur) | Snapshots catalogue / données élève offline |
| localStorage | File de sync progression (max 50 / utilisateur) |

Redis **n’est pas** utilisé comme base métier NoSQL documentaire : pas de modèle métier MongoDB/équivalent dans le dépôt.

---

## 7. Intégrations externes

| Intégration | Usage | Preuve |
|-------------|-------|--------|
| Juggling Lab | Animations GIF via pattern/siteswap | `JugglingLabController` (`/api/juggling-lab/anim`) |
| Google Fonts | Syne / DM Sans | `index.css` + cache Workbox fonts |

---

## 8. Qualité de construction

| Outil | Rôle |
|-------|------|
| Nx | Orchestration frontend (lint/test/build) |
| Maven Wrapper | Build/tests backend |
| Flyway | Migrations V1…V23 (V7/V8 absents ; V9/V10 présents) |
| Playwright | E2E |
| GitHub Actions | Pipeline |

---

## [EXTRAITS CODE recommandés]

```text
[EXTRAIT CODE : apps/backend/pom.xml — parent Spring Boot 3.4.2 / Java 21]
[EXTRAIT CODE : package.json — React 19 / Vite 8 / vite-plugin-pwa]
[EXTRAIT CODE : docker-compose.yml — services postgres, redis, backend]
[EXTRAIT CODE : apps/backend/.../security/SecurityConfig.java — règles d’accès]
```
