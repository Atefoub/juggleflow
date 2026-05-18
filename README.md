# JuggleFlow

Plateforme pédagogique web pour apprendre le jonglage en contexte scolaire : parcours progressifs, catalogue de figures (animations [Juggling Lab](https://jugglinglab.org/)), suivi enseignant, badges, conformité RGPD mineurs, et PWA hors-ligne pour les élèves.

## Stack

| Composant | Technologie |
|-----------|-------------|
| Monorepo | [Nx](https://nx.dev) 22 |
| Frontend | React 19, TypeScript, Tailwind 4, Vite, PWA (Workbox) |
| Backend | Spring Boot 3.4, Java 21, JWT + refresh httpOnly |
| Base de données | PostgreSQL 17, Flyway |
| CI | GitHub Actions (lint, tests, build) |

## Prérequis

- Node.js 22+, npm
- Java 21+, Maven (wrapper inclus dans `apps/backend`)
- PostgreSQL 17 (local ou via Docker)

## Démarrage rapide

### 1. Base de données et API (Docker)

```bash
cp apps/backend/.env.example apps/backend/.env
# Éditer apps/backend/.env : POSTGRES_PASSWORD, JWT_SECRET (≥ 32 caractères)

docker compose up -d postgres
docker compose up backend
```

L’API écoute sur `http://localhost:8080`. Swagger (si `SWAGGER_PUBLIC=true`) : `http://localhost:8080/swagger-ui.html`.

### 2. Frontend

```bash
npm ci
npx nx serve frontend
```

Application : `http://localhost:4200` (proxy API vers le backend).

### 3. Sans Docker (PostgreSQL local)

```bash
# Créer la base juggleflow_db et l’utilisateur, puis :
cd apps/backend
cp .env.example .env
./mvnw spring-boot:run
```

Dans un autre terminal : `npx nx serve frontend`.

## Comptes de démonstration

Activer dans `apps/backend/.env` :

```env
ADMIN_BOOTSTRAP_EMAIL=admin@juggleflow.local
ADMIN_BOOTSTRAP_PASSWORD=Admin2026!
DEMO_BOOTSTRAP_ENABLED=true
DEMO_BOOTSTRAP_PASSWORD=Demo2026!
```

| Rôle | Email (exemple) | Mot de passe |
|------|-------------------|--------------|
| Admin | `admin@juggleflow.local` | `Admin2026!` |
| Enseignant | `marie.dupont@ecole.fr` | `Demo2026!` |
| Élève | `lucas.martin@ecole.fr` | `Demo2026!` |

Après la première migration + bootstrap, redémarrer le backend une fois si les données démo ne apparaissent pas.

## Mot de passe oublié

1. L’utilisateur envoie sa demande depuis `/login/forgot`.
2. Une entrée `PASSWORD_RESET_REQUESTED` apparaît dans **Admin → Journal d’audit** (si le compte existe).
3. L’administrateur réinitialise le mot de passe depuis **Admin → Utilisateurs → Réinit. MDP** et transmet le mot de passe temporaire à l’établissement.

## Structure du dépôt

```
apps/
  frontend/     # PWA React (élève, enseignant, admin)
  backend/      # API Spring Boot, migrations Flyway
docker-compose.yml
.github/workflows/ci.yml
```

## Commandes utiles

```bash
npx nx serve frontend          # Dev frontend
npx nx build frontend          # Build production
npx nx lint frontend
npx nx test frontend

cd apps/backend && ./mvnw test # Tests backend
cd apps/backend && ./mvnw package
```

## Rôles et parcours

- **Élève** : onboarding, catalogue, progression, badges, défi du jour, ressources, mode hors-ligne.
- **Enseignant** : classes, groupes (vert / orange / rouge), assignation de parcours, export CSV, détection de blocage sur une figure.
- **Administrateur** : utilisateurs, classes, licences (plafond de sièges), RGPD (consentements, exports PDF/CSV), audit.

## Licence

MIT — voir le dépôt pour les détails du projet académique / produit.
