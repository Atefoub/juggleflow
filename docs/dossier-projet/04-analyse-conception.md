# 04 — Analyse et conception

**Sources :** `docs/analyse-projet/` (maquettes, MCD/MLD, classes, séquences, CU) croisées avec le code.

---

## 1. Démarche d’analyse

1. **Besoins** — personas et défis enseignants (PDF) ;
2. **Maquettes** — wireframes fournis + maquettes fil de fer dérivées des écrans réels (`01-maquettes.md`) ;
3. **Cas d’utilisation** — acteurs = rôles Spring Security ;
4. **Données** — MCD/MLD depuis Flyway V1→V23 ;
5. **Comportements** — diagrammes de séquences des flux implémentés.

---

## 2. Maquettage et UI

### 2.1 Conventions UI (code)

| Espace | Convention |
|--------|------------|
| Élève | Mobile-first, max ~430 px, navigation basse, thème sombre par défaut |
| Enseignant | Bottom nav mobile + sidebar ≥1024 px |
| Admin | Drawer mobile + sidebar ≥1024 px, thème clair `.jf-admin` |

Polices : Syne + DM Sans (`index.css`).  
Boutons souvent dimensionnés 44–48 px (accessibilité tactile).

### 2.2 Inventaire des écrans (réels)

Voir détail ASCII dans `docs/analyse-projet/01-maquettes.md` et routes dans [03-perimetre-fonctionnel.md](./03-perimetre-fonctionnel.md).

**[CAPTURE : wireframes-ui.png]** — intention UX fournie pour le dossier.

### 2.3 Écarts maquettes documentés (à ne pas « corriger » en inventant)

| Point | Maquette / doc | Code |
|-------|----------------|------|
| Filtre catalogue | Catégorie + niveau | Niveau + recherche + favoris (pas de filtre catégorie UI) |
| Nav enseignant | Entrée « Groupes » | Groupes hors menu principal |
| CRUD users admin | CRUD large | Création + enable/disable + reset password |
| Sync offline | Mentions Background Sync Workbox | File `localStorage` rejouée par l’app ouverte |

---

## 3. Architecture logique en couches

```text
┌─────────────────────────────────────────────┐
│  Présentation PWA (React pages/components)  │
├─────────────────────────────────────────────┤
│  Client API (Axios) + offline (IDB/queue)   │
├─────────────────────────────────────────────┤
│  API REST (controllers Spring)              │
├─────────────────────────────────────────────┤
│  Sécurité (JWT filter, rate limit, RBAC)    │
├─────────────────────────────────────────────┤
│  Services métier                            │
├─────────────────────────────────────────────┤
│  Repositories Spring Data JPA               │
├─────────────────────────────────────────────┤
│  PostgreSQL (Flyway)  │  Redis (sécurité)   │
└─────────────────────────────────────────────┘
```

Détail technique : [05-architecture-technique.md](./05-architecture-technique.md).

---

## 4. Modèle de données (MCD / MLD)

**Source complète :** `docs/analyse-projet/02-mcd-mld.md` (à reprendre en annexes / exports Mermaid).

### 4.1 Entités métier principales

| Concept | Table / entité | Rôle |
|---------|----------------|------|
| Utilisateur | `users` + sous-types | Auth, profil |
| Classe | `school_class` | Organisation scolaire |
| Figure / Trick | `trick` | Contenu pédagogique jonglage |
| Progression | `user_progress` | Statut par figure |
| Parcours | `learning_path` + steps | Progression structurée |
| Assignation | `class_learning_path`, `student_learning_path` | Cible pédagogique |
| Badge | `badge`, `user_badge` | Gamification persistée |
| Consentement | `gdpr_consent` | RGPD |
| Licence | `establishment_settings` | Capacité établissement |
| Audit | `admin_audit_event` | Traçabilité admin |

### 4.2 Règles métier structurantes

| Règle | Où |
|-------|-----|
| Assignation individuelle prioritaire sur classe | `PathAssignmentResolver` |
| Groupe couleur auto si non forcé | `StudentSummaryResponse` (≥70 / ≥40) |
| Blocage enseignant | ≥3 tentatives sur étape courante sans maîtrise — `StudentBlockageService` |
| Un consentement par `(user, type)` | contrainte V23 |

---

## 5. Diagramme de classes (backend)

**Source :** `docs/analyse-projet/03-diagramme-classes.md` + package `model/`.

Packages Java principaux (`com.juggleflow.backend`) :

| Package | Contenu |
|---------|---------|
| `controller` | 17 contrôleurs REST |
| `service` (+ `service.gdpr`) | Logique métier |
| `model` | ~25 entités JPA |
| `repository` | Spring Data (+ anonymisation Postgres) |
| `security` | JWT, cookies, rate limit, UserDetails |
| `dto` | Contrats API |
| `bootstrap` | Admin / démo |
| `config` | OpenAPI, prod safety, registration props |
| `exception` | Handler global |

---

## 6. Diagrammes de séquences (flux clés)

**Source :** `docs/analyse-projet/04-diagramme-sequences.md`.

### 6.1 Authentification

`LoginPage` → `POST /api/auth/login` → BCrypt → access JWT + refresh cookie httpOnly → `GET /api/auth/me` → redirection selon rôle / onboarding.

Refresh : intercepteur Axios sur 401 → `POST /api/auth/refresh`.  
Logout : révocation JTI + clear cookie.

### 6.2 Progression (+ offline)

Session UI → `PUT /api/progress/{trickId}` → upsert progression → streak → évaluation badges.  
Hors ligne : enqueue (`offlineQueue.ts`) → flush au retour réseau via `AuthContext`.

**Limite documentée :** la table `practice_session` n’est pas alimentée par ce flux UI ; le chronomètre reste côté frontend.

### 6.3 Assignation de parcours

Enseignant → `LearningPathController` → `LearningPathService` → tables `class_learning_path` / `student_learning_path` → parcours effectif résolu pour l’élève.

### 6.4 Contrôle parental (login élève)

À chaque auth / refresh / filtre JWT : vérification consentement parental pour les élèves ; compte désactivé si invalide / manquant (`GdprService` + `JwtFilter`).

---

## 7. Choix de conception justifiés (faits)

| Choix | Justification liée au code / docs |
|-------|-----------------------------------|
| PWA | Usage salle / mobile, offline progress |
| API stateless JWT | Scalabilité + cookie refresh SameSite=Strict |
| Redis | Révocation multi-instances + rate limit distribué |
| Flyway + `ddl-auto=validate` | Schéma maîtrisé, pas de génération Hibernate sauvage |
| JOINED inheritance users | Rôles métier distincts avec champs spécifiques |
| Podman Compose | Environnement local reproductible (preuves captures) |

---

## 8. Artefacts à joindre en mise en page

- Export Mermaid MCD (`02-mcd-mld.md`)
- Export CU (`05-diagramme-cas-utilisation.md`)
- Export séquences (`04-diagramme-sequences.md`)
- `[EXTRAIT CODE : apps/frontend/src/router/AppRouter.tsx]`
- `[EXTRAIT CODE : apps/backend/src/main/java/com/juggleflow/backend/security/SecurityConfig.java]`
