# 08 — Données et accès (SQL / Redis)

**Sources :** migrations Flyway, entités JPA, repositories, config Redis, `docs/analyse-projet/02-mcd-mld.md`.

---

## 1. Base relationnelle PostgreSQL

| Élément | Constat |
|---------|---------|
| Image Compose | `postgres:17-alpine` |
| ORM | Spring Data JPA / Hibernate |
| Schéma | Flyway (`classpath:db/migration`) |
| Mode Hibernate | validate (`open-in-view=false`) |
| Volume Podman | `juggleflow_pgdata` (preuve capture volumes) |

---

## 2. Migrations Flyway

**21 fichiers**, versions **V1 → V23** avec **V7 et V8 absents** (V9/V10 présents ; raisons du saut `[NON VÉRIFIÉ]`).

| Version | Contenu synthétique |
|---------|---------------------|
| V1 | Schéma initial users JOINED, classes, tricks, badges, progress, GDPR, learning paths |
| V2 | Seeds niveaux, catégories, badges, figures |
| V3 | Siteswap Juggling Lab |
| V4 | Audit admin |
| V5 | Streaks, `practice_session`, défis quotidiens |
| V6 | Expiration consentements |
| V9 | Onboarding élève, licence établissement, ressources pédagogiques |
| V10 | Seeds parcours |
| V11 | Groupe couleur élève |
| V12 | Favoris |
| V13–V17 | Enrichissements pédagogiques FR, tips JSONB, animations |
| V18 | Niveau EXPERT onboarding |
| V19 | Préférence dark mode |
| V20 | Assignation parcours individuelle |
| V21 | +30 figures Library of Juggling |
| V22 | Expansion parcours |
| V23 | Unicité consentement `(user, type)` |

---

## 3. Accès SQL (couche repository)

Pattern : interfaces Spring Data JPA sous `repository/`.

Exemples de responsabilités :

- CRUD / requêtes dérivées sur users, progress, paths, badges, consents ;
- `PostgresStudentAnonymizationRepository` pour anonymisation SQL native fin d’année.

Transactions : services Spring (`@Transactional` là où applicable — détails méthode par méthode à citer en extrait si besoin oral).

Concurrence documentée par tests :

- upsert progression concurrent → une seule ligne (`ProgressServiceTest`) ;
- licence : un siège restant (`EstablishmentLicenseServiceTest`).

---

## 4. Redis — usage réel (pas NoSQL métier)

| Usage | Clé / mécanisme | Fichiers |
|-------|-----------------|----------|
| Révocation JWT | `jwt:revoked:jti:<JTI>` + TTL | `JwtUtils` |
| Rate limiting | `ratelimit:auth:ip:<IP>` + script Lua | `RateLimitFilter` |

Configuration :

- Dev : stores mémoire possibles ;
- Prod : `app.jwt.revocation.store=redis` et `app.rate-limit.store=redis` forcés ;
- Compose : `redis:7.4-alpine`, AOF, volume `juggleflow_redisdata`.

**CP8 — formulation exacte pour le jury :**

> L’application utilise une base **relationnelle SQL (PostgreSQL)** pour le métier. Redis est employé comme **store technique** (révocation de jetons et limitation de débit), pas comme base documentaire métier NoSQL.

Aucune dépendance MongoDB / Cassandra / Elasticsearch métier n’a été trouvée dans le backend inspecté.

---

## 5. Table `practice_session` (limite)

Créée en V5. Utilisable pour calculs de badges (temps de pratique).  
**Aucun service de production n’écrit** actuellement les sessions chronométrées UI dans cette table (`docs/analyse-projet/README.md`).  
Le streak est mis à jour via `PUT /api/progress/{trickId}`.

---

## 6. Stockage fichiers pédagogiques

Upload admin PDF via `AdminPedagogicalResourceController` + `ResourceStorageService`.  
Emplacement disque exact / stratégie cloud : à citer depuis le code du service lors de la mise en page `[EXTRAIT CODE : ResourceStorageService.java]`.

---

## 7. Données offline navigateur

Hors serveur, le navigateur conserve :

- snapshots IndexedDB (catalogue / élève) ;
- file `localStorage` des `PUT` progression.

Ce n’est **pas** un second modèle relationnel serveur.

---

## 8. Diagrammes à joindre

- MCD Mermaid : `docs/analyse-projet/02-mcd-mld.md`
- MLD tables : même fichier
- `[CAPTURE : podman-volumes.png]` — persistence Postgres/Redis
- `[EXTRAIT CODE : V1__init_schema.sql — extrait users / user_progress]`
- `[EXTRAIT CODE : V20__student_learning_path.sql]`
