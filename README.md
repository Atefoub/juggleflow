# JuggleFlow

Plateforme pédagogique web pour l'apprentissage du jonglage en contexte scolaire. JuggleFlow propose des parcours progressifs, un catalogue de figures animées, un suivi enseignant en temps réel, un système de gamification (XP, badges, séries) et une conformité RGPD adaptée aux établissements accueillant des mineurs.

L'application fonctionne comme une **Progressive Web App (PWA)** : elle s'installe sur mobile et reste utilisable hors connexion pendant les séances en salle.

---

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Production checklist](#production-checklist)
- [Rôles et parcours utilisateurs](#rôles-et-parcours-utilisateurs)
- [Conformité RGPD](#conformité-rgpd)
- [Contribuer](#contribuer)
- [Licence](#licence)

---

## Fonctionnalités

### Élève
- Onboarding personnalisé selon le niveau initial (débutant → expert)
- Catalogue de figures avec animations générées par [Juggling Lab](https://jugglinglab.org/) (notation siteswap)
- Parcours pédagogiques progressifs assignés par l'enseignant
- Suivi de progression par figure (non commencé / en cours / maîtrisé)
- Sessions de pratique chronométrées
- Système de points XP et de rangs (Bronze, Argent, Or)
- Badges de progression (maîtrise, séries, paliers)
- Défi du jour (identique pour tous les élèves d'un même établissement)
- Favoris et ressources pédagogiques (vidéos, exercices, module théorique)
- Mode hors-ligne avec synchronisation différée des mises à jour de progression
- Installation PWA (icône sur l'écran d'accueil, mode standalone)

### Enseignant
- Gestion de classes et de groupes colorés (Vert / Orange / Rouge)
- Assignation de parcours à une classe
- Tableau de bord : progression moyenne, alertes de blocage par figure
- Fiche individuelle par élève avec historique de progression
- Export CSV de la progression par parcours
- Consultation des ressources pédagogiques

### Administrateur
- Gestion des utilisateurs (création, activation/désactivation, réinitialisation de mot de passe)
- Gestion des classes et des établissements
- Gestion des ressources pédagogiques (upload PDF)
- Tableau de bord : statistiques de l'établissement
- Journal d'audit des actions sensibles
- Gestion des licences (plafond de sièges, date d'expiration, édition via l'interface admin)
- Interface RGPD : consentements parentaux, exports CSV/PDF, relance

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Monorepo | [Nx](https://nx.dev) 22 |
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite |
| PWA | Workbox (Service Worker, cache offline, sync différée) |
| Backend | Spring Boot 3.4, Java 21 |
| Authentification | JWT (access + refresh token httpOnly), blacklist JTI (Redis recommandé) |
| Base de données | PostgreSQL 17, migrations Flyway |
| Cache / sécurité | Redis 7 (révocation JWT + rate limiting distribués) |
| CI/CD | GitHub Actions (lint, tests, build) |
| Conteneurisation | Docker / Podman (Compose pour le dev local) |

---

## Prérequis

- **Node.js** 22+ et npm
- **Java** 21+
- **PostgreSQL** 17 (local ou via Docker)
- **Redis** 7 (recommandé, requis en multi-instances)
- Docker ou Podman (optionnel, recommandé)

---

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-org/juggleflow.git
cd juggleflow

# Installer les dépendances Node
npm ci
```

---

## Configuration

Copier le fichier d'exemple et renseigner les variables obligatoires :

```bash
cp apps/backend/.env.example apps/backend/.env
```

Ouvrir `apps/backend/.env` et définir au minimum :

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Mot de passe de la base de données |
| `JWT_SECRET` | Secret JWT (minimum 32 caractères, généré aléatoirement) |
| `CORS_ALLOWED_ORIGINS` | URL du frontend (ex. `https://juggleflow.monecole.fr`) |

Toutes les autres variables disposent de valeurs par défaut documentées dans `.env.example`.

> **Sécurité** — Ne jamais versionner le fichier `.env`. Ne jamais utiliser les valeurs par défaut en production.

---

## Démarrage

### Avec Docker (recommandé)

```bash
# Démarrer PostgreSQL + Redis
docker compose up -d postgres redis

# Démarrer le backend (les migrations Flyway s'exécutent automatiquement)
docker compose up backend
```

L'API est disponible sur `http://localhost:8080`.

### Mode "prod-like" (image immutable — Podman/Docker)

Ce mode ne monte pas le code source dans le conteneur et se rapproche d'un déploiement réel.
Le healthcheck est défini dans `compose.prod.yml` (Kubernetes utilise des probes).

```bash
# Variables minimales (exemples)
export POSTGRES_PASSWORD='change-me'
export JWT_SECRET='change-me-please-generate-a-long-secret-32-chars-minimum'
export CORS_ALLOWED_ORIGINS='http://localhost:4200'

# Podman
podman compose -f compose.prod.yml up -d

# (ou Docker)
docker compose -f compose.prod.yml up -d
```

### Frontend

```bash
npx nx serve frontend
```

L'application est disponible sur `http://localhost:4200`.

### Sans Docker (PostgreSQL local)

```bash
# Créer la base et l'utilisateur PostgreSQL, puis :
cd apps/backend
./mvnw spring-boot:run
```

---

## Comptes de démonstration

Pour activer les données de démonstration (dev/soutenance uniquement), définir dans `.env` :

```env
ADMIN_BOOTSTRAP_EMAIL=admin@juggleflow.local
ADMIN_BOOTSTRAP_PASSWORD=<mot-de-passe-complexe>
DEMO_BOOTSTRAP_ENABLED=true
DEMO_BOOTSTRAP_PASSWORD=<mot-de-passe-demo>
```

| Rôle | Email |
|------|-------|
| Administrateur | `admin@juggleflow.local` |
| Enseignant | `marie.dupont@ecole.fr` |
| Élève | `lucas.martin@ecole.fr` |

> Ces comptes sont créés uniquement si les variables bootstrap sont définies. Ne jamais activer en production.

---

## Structure du projet

```
juggleflow/
├── apps/
│   ├── frontend/              # PWA React (élève, enseignant, admin)
│   │   ├── src/
│   │   │   ├── api/           # Couche d'appels HTTP + wrappers offline
│   │   │   ├── components/    # Composants réutilisables
│   │   │   ├── pages/         # Pages par rôle (student/, teacher/, admin/)
│   │   │   ├── hooks/         # Hooks React (statut réseau, PWA…)
│   │   │   └── utils/         # Logique métier (offline queue, pathProgress…)
│   │   └── vite.config.mts
│   └── backend/               # API Spring Boot
│       ├── src/main/java/com/juggleflow/backend/
│       │   ├── controller/    # Endpoints REST
│       │   ├── service/       # Logique métier
│       │   ├── model/         # Entités JPA
│       │   ├── dto/           # Objets de transfert
│       │   ├── repository/    # Couche d'accès données (Spring Data)
│       │   └── security/      # JWT, filtres, rate limiting
│       └── src/main/resources/db/migration/   # Migrations Flyway (V1 → V18)
├── docker-compose.yml         # Stack dev locale
├── .github/workflows/ci.yml   # Pipeline CI
└── nx.json                    # Configuration Nx
```

---

## Tests

### Frontend

```bash
npx nx test frontend       # Tests unitaires (Vitest)
npx nx lint frontend       # Lint ESLint
```

### E2E (Playwright)

Prérequis : PostgreSQL + API avec données démo (`DEMO_BOOTSTRAP_ENABLED=true`).

```bash
docker compose up -d postgres
docker compose up backend
# autre terminal
npx playwright install chromium
npm run e2e
```

Le test smoke vérifie la connexion enseignant (`marie.dupont@ecole.fr` / `Demo2026!`) jusqu'au tableau de bord.

### Backend

```bash
cd apps/backend
./mvnw test                # Tests unitaires et d'intégration (JUnit 5)
./mvnw clean package       # Build du JAR
```

### CI

Chaque push sur `master` et chaque pull request déclenchent automatiquement lint + tests + build (frontend et backend) et un **test E2E smoke** Playwright via GitHub Actions.

---

## Déploiement

### Variables d'environnement de production (backend)

| Variable | Valeur recommandée |
|----------|--------------------|
| `JWT_SECRET` | Chaîne aléatoire ≥ 64 caractères (`openssl rand -base64 64`) |
| `COOKIE_SECURE` | `true` (HTTPS obligatoire) |
| `SWAGGER_ENABLED` | `false` |
| `APP_TRUSTED_PROXY` | `true` si derrière un reverse proxy (nginx, Traefik, AWS ALB) |
| `CORS_ALLOWED_ORIGINS` | URL de production du frontend uniquement |
| `DEMO_BOOTSTRAP_ENABLED` | `false` |
| `ADMIN_BOOTSTRAP_EMAIL` | Laisser vide après la première initialisation |

### Reverse proxy / IP client (rate limiting, audit)

Si `APP_TRUSTED_PROXY=true`, le backend utilise la **dernière** entrée de `X-Forwarded-For` pour déterminer l'IP client.
C'est intentionnel : derrière un proxy de confiance qui **ajoute** sa propre IP en fin de liste, cette valeur correspond à l'IP
TCP vue par le proxy et n'est pas forgeable par un client.

Assure-toi que ton proxy est configuré pour :
- **Ajouter** `X-Forwarded-For` (append) et ne pas accepter une valeur fournie par le client sans la réécrire
- Ne définir `APP_TRUSTED_PROXY=true` que si le trafic passe bien par ce proxy (sinon `X-Forwarded-For` est forgeable)

### Build de production (frontend)

```bash
npx nx build frontend
# Les fichiers statiques sont générés dans apps/frontend/dist/
# À servir via nginx ou un CDN.
```

---

## Production checklist

Voir `PRODUCTION_CHECKLIST.md`.

## Sécurité (GitHub Actions)

Certains checks (Dependency Review / CodeQL) peuvent nécessiter l'activation de fonctionnalités GitHub côté dépôt :
- `Settings → Security and analysis → Dependency graph` : **Enable**
- `Settings → Security and analysis → Code scanning` : **Enable** (si disponible)

Si ces fonctionnalités ne sont pas disponibles sur ton plan, la CI reste verte : les workflows exécutent les analyses
sans upload des résultats.

### Healthcheck

L'endpoint `/actuator/health` est exposé pour les sondes Kubernetes et Docker. Il ne retourne aucune information d'infrastructure.

---

## Rôles et parcours utilisateurs

```
Élève      →  Onboarding → Catalogue → Parcours → Session → Badges
Enseignant →  Classes → Groupes → Parcours → Suivi élèves → Export CSV
Admin      →  Utilisateurs → Licences → RGPD → Audit
```

Le système de **groupes colorés** (Vert / Orange / Rouge) permet à l'enseignant de segmenter sa classe selon la progression et d'identifier rapidement les élèves en difficulté ou bloqués sur une figure.

---

## Conformité RGPD

JuggleFlow est conçu pour les établissements scolaires accueillant des mineurs :

- Consentement parental requis, versionné et horodaté
- Expiration automatique des consentements (durée configurable, défaut : 1 an scolaire)
- Export des données personnelles au format PDF ou CSV (droit d'accès)
- Suppression et anonymisation via l'interface admin
- Journal d'audit de toutes les actions sensibles (création, réinitialisation de mot de passe, désactivation)
- Aucune donnée partagée avec des tiers

---

## Contribuer

1. Créer une branche à partir de `master` : `git checkout -b feat/ma-fonctionnalite`
2. Suivre les conventions de commit (conventional commits recommandé)
3. S'assurer que les tests passent : `npm run test` et `./mvnw test`
4. Ouvrir une pull request avec une description claire de la modification

---

## Licence

MIT — voir [LICENSE](LICENSE) pour les détails.

---

*JuggleFlow — Projet pédagogique. Animations de jonglage générées par [Juggling Lab](https://jugglinglab.org/) (logiciel libre, licence GPL).*
