# MCD / MLD — JuggleFlow

**Date :** 30 juin 2026  
**Source schéma :** migrations Flyway `apps/backend/src/main/resources/db/migration/V1__init_schema.sql` … `V23__gdpr_consent_user_type_unique.sql`

---

## 1. Modèle Conceptuel de Données (MCD)

### 1.1 Diagramme entité-association

```mermaid
erDiagram
    UTILISATEUR ||--o| ELEVE : "est un"
    UTILISATEUR ||--o| ENSEIGNANT : "est un"
    UTILISATEUR ||--o| ADMINISTRATEUR : "est un"

    ELEVE }o--|| CLASSE : "appartient à"
    CLASSE }o--o| ENSEIGNANT : "prof principal"

    FIGURE }o--|| NIVEAU_DIFFICULTE : "a"
    FIGURE }o--o| CATEGORIE : "appartient à"
    FIGURE }o--o{ FIGURE : "prérequis"

    UTILISATEUR ||--o{ PROGRESSION : "possède"
    FIGURE ||--o{ PROGRESSION : "concernée par"

    TYPE_BADGE ||--o{ BADGE : "catégorise"
    UTILISATEUR ||--o{ BADGE_UTILISATEUR : "débloque"
    BADGE ||--o{ BADGE_UTILISATEUR : "attribué"

    UTILISATEUR ||--o{ CONSENTEMENT_RGPD : "donne"
    UTILISATEUR ||--o| SERIE_PRATIQUE : "a"
    UTILISATEUR ||--o{ FAVORI : "marque"
    FIGURE ||--o{ FAVORI : "favorisée"

    PARCOURS ||--o{ ETAPE_PARCOURS : "contient"
    FIGURE ||--o{ ETAPE_PARCOURS : "étape de"
    CLASSE ||--o{ PARCOURS_CLASSE : "reçoit"
    PARCOURS ||--o{ PARCOURS_CLASSE : "assigné à"
    ELEVE ||--o{ PARCOURS_ELEVE : "reçoit (prioritaire)"
    PARCOURS ||--o{ PARCOURS_ELEVE : "assigné à"

    UTILISATEUR ||--o{ CHAPITRE_CERVEAU : "termine"
    UTILISATEUR ||--o{ SESSION_PRATIQUE : "effectue"
    FIGURE ||--o{ SESSION_PRATIQUE : "optionnel"

    DEFI_QUOTIDIEN }o--o| FIGURE : "cible"

    UTILISATEUR {
        bigint id PK
        string email UK
        string user_type
        string first_name
        string last_name
        boolean enabled
    }

    ELEVE {
        bigint id PK_FK
        bigint class_id FK
        string juggling_level
        string assigned_group_color
        boolean dark_mode_enabled
    }

    CLASSE {
        bigint class_id PK
        string class_name
        string school_level
        int school_year
    }

    FIGURE {
        bigint trick_id PK
        string trick_name UK
        string siteswap
        int difficulty_score
    }

    PARCOURS {
        bigint learning_path_id PK
        string path_name
        string target_level
        boolean active
    }

    PROGRESSION {
        bigint progress_id PK
        string status
        int mastery_percentage
        int attempt_count
    }
```

### 1.2 Règles métier (code source)

| Règle | Implémentation |
|-------|----------------|
| Héritage utilisateur JOINED | `User.java` — discriminant `user_type` |
| Parcours effectif élève | Assignation individuelle (`student_learning_path`) prioritaire sur assignation classe (`class_learning_path`) — `PathAssignmentResolver.java` |
| Groupe couleur auto | Si `assigned_group_color` NULL : ≥70 % → VERT, ≥40 % → ORANGE, sinon ROUGE — `StudentSummaryResponse.java` |
| Blocage enseignant | ≥3 tentatives sur l'étape courante sans maîtrise — `StudentBlockageService.java` |
| Défi du jour | `epochDay % count(active)` — `DailyChallengeService.java` |
| Consentement RGPD | Un enregistrement par `(user_id, consent_type)` — contrainte V23 |

---

## 2. Modèle Logique de Données (MLD)

### 2.1 Table `users` (parent JOINED)

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | BIGSERIAL | PK |
| `user_type` | VARCHAR(31) | NOT NULL, CHECK IN ('student','teacher','administrator') |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `password` | VARCHAR(255) | NOT NULL |
| `first_name` | VARCHAR(100) | NOT NULL |
| `last_name` | VARCHAR(100) | NOT NULL |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Index :** `idx_users_email`, `idx_users_type`, `idx_users_enabled`

### 2.2 Table `student`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | BIGINT | PK, FK → `users(id)` ON DELETE CASCADE |
| `class_id` | BIGINT | FK → `school_class(class_id)` ON DELETE SET NULL |
| `school_level` | VARCHAR(50) | |
| `birth_date` | DATE | |
| `enrollment_date` | DATE | |
| `juggling_level` | VARCHAR(20) | V9 — BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| `onboarding_completed_at` | TIMESTAMPTZ | V9 |
| `assigned_group_color` | VARCHAR(10) | V11 — NULL, VERT, ORANGE, ROUGE |
| `practice_reminders_enabled` | BOOLEAN | V14, DEFAULT TRUE |
| `dark_mode_enabled` | BOOLEAN | V19, DEFAULT TRUE |

### 2.3 Table `teacher`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | BIGINT | PK, FK → `users(id)` ON DELETE CASCADE |
| `subjects_taught` | TEXT | |
| `certified` | BOOLEAN | NOT NULL, DEFAULT FALSE |

### 2.4 Table `administrator`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `id` | BIGINT | PK, FK → `users(id)` ON DELETE CASCADE |
| `admin_role` | VARCHAR(50) | DEFAULT 'school_admin' |

### 2.5 Table `school_class`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `class_id` | BIGSERIAL | PK |
| `class_name` | VARCHAR(100) | NOT NULL |
| `school_level` | VARCHAR(10) | CHECK IN (PS,MS,GS,CP,CE1,CE2,CM1,CM2) |
| `school_year` | INTEGER | NOT NULL, CHECK 2020–2100 |
| `student_count` | INTEGER | NOT NULL, DEFAULT 0, CHECK ≥ 0 |
| `homeroom_teacher_id` | BIGINT | FK → `teacher(id)` ON DELETE SET NULL |

**Contrainte :** UNIQUE(`class_name`, `school_year`)

### 2.6 Table `difficulty_level`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `level_id` | BIGSERIAL | PK |
| `level_name` | VARCHAR(50) | NOT NULL, UNIQUE |
| `description` | TEXT | |
| `progression_order` | INTEGER | NOT NULL, UNIQUE, CHECK > 0 |

### 2.7 Table `category`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `category_id` | BIGSERIAL | PK |
| `category_name` | VARCHAR(100) | NOT NULL, UNIQUE |
| `description` | TEXT | |
| `icon` | VARCHAR(50) | |

### 2.8 Table `trick`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `trick_id` | BIGSERIAL | PK |
| `trick_name` | VARCHAR(255) | NOT NULL, UNIQUE |
| `siteswap` | VARCHAR(100) | |
| `description` | TEXT | |
| `juggling_lab_animation_url` | TEXT | |
| `juggling_lab_pattern` | TEXT | V16 |
| `learning_tips` | JSONB | V16 |
| `difficulty_score` | INTEGER | CHECK 1–10 |
| `estimated_learning_duration` | INTEGER | CHECK > 0 |
| `popular` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `level_id` | BIGINT | NOT NULL, FK → `difficulty_level` ON DELETE RESTRICT |
| `category_id` | BIGINT | FK → `category` ON DELETE SET NULL |

### 2.9 Table `prerequisite` (N-N auto-référentielle)

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `trick_id` | BIGINT | PK, FK → `trick` ON DELETE CASCADE |
| `prerequisite_trick_id` | BIGINT | PK, FK → `trick` ON DELETE CASCADE |

**Contrainte :** CHECK `trick_id <> prerequisite_trick_id`

### 2.10 Tables badges

**`badge_type`** : `badge_type_id` PK, `type_name` UNIQUE, `description`, `color`

**`badge`** : `badge_id` PK, `badge_name` UNIQUE, `description`, `icon_url`, `unlock_criteria` (JSON texte), `experience_points` ≥ 0, `difficulty_order` > 0, `badge_type_id` FK

**`user_badge`** : `user_badge_id` PK, `user_id` FK, `badge_id` FK, `unlocked_at`, `notified` — UNIQUE(`user_id`, `badge_id`)

Critères `unlock_criteria` (seed V2) : `tricks_mastered`, `consecutive_days`, `practice_time`

### 2.11 Table `user_progress`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `progress_id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, FK → `users` ON DELETE CASCADE |
| `trick_id` | BIGINT | NOT NULL, FK → `trick` ON DELETE RESTRICT |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'NOT_STARTED', CHECK IN (NOT_STARTED, IN_PROGRESS, MASTERED) |
| `mastery_percentage` | INTEGER | NOT NULL, DEFAULT 0, CHECK 0–100 |
| `attempt_count` | INTEGER | NOT NULL, DEFAULT 0, CHECK ≥ 0 |
| `started_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `mastered_at` | TIMESTAMPTZ | |
| `last_practice` | TIMESTAMPTZ | |

**Contraintes :** UNIQUE(`user_id`, `trick_id`), CHECK `mastered_at >= started_at`

### 2.12 Table `gdpr_consent`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `consent_id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, FK → `users` ON DELETE CASCADE |
| `consent_type` | VARCHAR(30) | NOT NULL, CHECK IN (DATA_USAGE, COMMUNICATION, COOKIES, PARENTAL_MINOR) |
| `consent_given` | BOOLEAN | NOT NULL |
| `consent_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `policy_version` | VARCHAR(20) | NOT NULL |
| `ip_address` | VARCHAR(45) | |
| `legal_guardian_id` | BIGINT | FK → `users` ON DELETE SET NULL |
| `expires_at` | TIMESTAMPTZ | V6 |

**Contrainte V23 :** UNIQUE(`user_id`, `consent_type`)

### 2.13 Tables parcours

**`learning_path`** : `learning_path_id` PK, `path_name`, `description`, `target_level` (BEGINNER…EXPERT), `estimated_duration_days`, `active`

**`learning_path_step`** : `step_id` PK, `learning_path_id` FK, `trick_id` FK, `step_order` > 0, `instructions`, `min_practice_time` — UNIQUE(`learning_path_id`, `step_order`), UNIQUE(`learning_path_id`, `trick_id`)

**`class_learning_path`** : `class_learning_path_id` PK, `learning_path_id` FK, `class_id` FK, `start_date`, `expected_end_date` — UNIQUE(`learning_path_id`, `class_id`)

**`student_learning_path`** (V20) : `student_learning_path_id` PK, `student_id` FK → `users`, `learning_path_id` FK, `start_date`, `expected_end_date` — UNIQUE(`student_id`, `learning_path_id`)

### 2.14 Tables complémentaires

**`user_streak`** (V5) : `user_id` PK FK, `current_streak_days`, `longest_streak_days`, `last_practice_date`, `updated_at`

**`practice_session`** (V5) : `id` PK, `user_id` FK, `trick_id` FK nullable, `started_at`, `ended_at`, `duration_seconds` > 0, `source` DEFAULT 'student_session', `created_at`

**`daily_challenge`** (V5) : `id` PK, `rotation_slot` UNIQUE ≥ 0, `title`, `description`, `target_trick_id` FK nullable, `target_value`, `target_unit`, `active`

**`establishment_settings`** (V9) : singleton `id` = 1, `establishment_name`, `license_seat_cap`, `license_expires_at`

**`pedagogical_resource`** (V9) : `resource_id` PK, `audience` (TEACHER/STUDENT), `resource_type`, `title`, `subtitle`, `meta_label`, `resource_url`, `tags`, `sort_order`, `active`

**`admin_audit_event`** (V4) : `id` PK, `occurred_at`, `actor_email`, `action`, `details`

**`user_favorite_trick`** (V12) : `id` PK, `user_id` FK, `trick_id` FK, `created_at` — UNIQUE(`user_id`, `trick_id`)

**`student_brain_module_chapter`** (V14) : PK composite (`user_id`, `chapter_number` 1–3), `completed_at`

### 2.5 Dictionnaire des énumérations

| Domaine | Valeurs |
|---------|---------|
| `user_type` | student, teacher, administrator |
| `user_progress.status` | NOT_STARTED, IN_PROGRESS, MASTERED |
| `learning_path.target_level` | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| `gdpr_consent.consent_type` | DATA_USAGE, COMMUNICATION, COOKIES, PARENTAL_MINOR |
| `student.assigned_group_color` | NULL, VERT, ORANGE, ROUGE |
| `school_class.school_level` | PS, MS, GS, CP, CE1, CE2, CM1, CM2 |
| `pedagogical_resource.audience` | TEACHER, STUDENT |
| `pedagogical_resource.resource_type` | STUDY_PDF, TEACHER_VIDEO, TEACHER_GUIDE, STUDENT_VIDEO, STUDENT_EXERCISE, BRAIN_MODULE |

---

## 3. Schéma relationnel synthétique

```
users ──┬── student ────────── school_class ── teacher (homeroom)
        ├── teacher
        └── administrator

trick ──┬── difficulty_level
        ├── category
        ├── prerequisite (N-N)
        ├── user_progress ── users
        ├── learning_path_step ── learning_path
        ├── user_favorite_trick ── users
        └── daily_challenge (optionnel)

learning_path ──┬── class_learning_path ── school_class
                └── student_learning_path ── users (student)

badge_type ── badge ── user_badge ── users

users ──┬── gdpr_consent
        ├── user_streak
        ├── practice_session
        └── student_brain_module_chapter

establishment_settings (singleton)
pedagogical_resource
admin_audit_event
```

**Total :** 26 tables PostgreSQL, 23 migrations Flyway.
