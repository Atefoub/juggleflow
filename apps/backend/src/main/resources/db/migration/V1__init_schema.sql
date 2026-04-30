-- =============================================================
-- JuggleFlow — PostgreSQL Schema v2
-- Flyway migration V1 — initialisation complète du schéma
--
-- IMPORTANT : ce fichier remplace init/juggleflow_postgresql_en.sql.
-- Les instructions DROP TABLE ont été supprimées : Flyway gère le
-- versioning, on ne droppe pas en migration initiale.
-- =============================================================


-- =============================================================
--  TRIGGER FUNCTION — automatic updated_at refresh
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
--  TABLE : users
-- =============================================================

CREATE TABLE users (
                     id          BIGSERIAL       PRIMARY KEY,
                     user_type   VARCHAR(31)     NOT NULL
                       CHECK (user_type IN ('student', 'teacher', 'administrator')),
                     email       VARCHAR(255)    NOT NULL UNIQUE,
                     password    VARCHAR(255)    NOT NULL,
                     first_name  VARCHAR(100)    NOT NULL,
                     last_name   VARCHAR(100)    NOT NULL,
                     enabled     BOOLEAN         NOT NULL DEFAULT TRUE,
                     created_at  TIMESTAMPTZ     DEFAULT NOW(),
                     updated_at  TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_users_email   ON users (email);
CREATE INDEX idx_users_type    ON users (user_type);
CREATE INDEX idx_users_enabled ON users (enabled);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE users IS
    'Parent table for all user types (JOINED inheritance). '
    'Subtype determined by user_type discriminator.';


-- =============================================================
--  TABLE : student
-- =============================================================

CREATE TABLE student (
                       id              BIGINT      PRIMARY KEY
                         REFERENCES users (id) ON DELETE CASCADE,
                       class_id        BIGINT,
                       school_level    VARCHAR(50),
                       birth_date      DATE,
                       enrollment_date DATE
);

CREATE INDEX idx_student_class ON student (class_id);

COMMENT ON TABLE student IS
    'Student-specific data. id is a FK to users (JOINED inheritance).';


-- =============================================================
--  TABLE : teacher
-- =============================================================

CREATE TABLE teacher (
                       id              BIGINT      PRIMARY KEY
                         REFERENCES users (id) ON DELETE CASCADE,
                       subjects_taught TEXT,
                       certified       BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE teacher IS
    'Teacher-specific data. id is a FK to users (JOINED inheritance).';


-- =============================================================
--  TABLE : administrator
-- =============================================================

CREATE TABLE administrator (
                             id          BIGINT      PRIMARY KEY
                               REFERENCES users (id) ON DELETE CASCADE,
                             admin_role  VARCHAR(50) DEFAULT 'school_admin'
);

COMMENT ON TABLE administrator IS
    'Administrator-specific data. id is a FK to users (JOINED inheritance).';


-- =============================================================
--  TABLE : school_class
-- =============================================================

CREATE TABLE school_class (
                            class_id            BIGSERIAL       PRIMARY KEY,
                            class_name          VARCHAR(100)    NOT NULL,
                            school_level        VARCHAR(10)
                              CHECK (school_level IN
                                     ('PS','MS','GS','CP','CE1','CE2','CM1','CM2')),
                            school_year         INTEGER         NOT NULL
                              CHECK (school_year >= 2020 AND school_year <= 2100),
                            student_count       INTEGER         NOT NULL DEFAULT 0
                              CHECK (student_count >= 0),
                            homeroom_teacher_id BIGINT
                                                                REFERENCES teacher (id) ON DELETE SET NULL,

                            CONSTRAINT uq_class_name_year UNIQUE (class_name, school_year)
);

CREATE INDEX idx_school_class_teacher ON school_class (homeroom_teacher_id);
CREATE INDEX idx_school_class_year    ON school_class (school_year);

COMMENT ON TABLE school_class IS
    'School classes. Maps to SchoolClass JPA entity. '
    'No School parent entity — standalone table.';

-- FK student → school_class (ajoutée après création de school_class)
ALTER TABLE student
  ADD CONSTRAINT fk_student_class
    FOREIGN KEY (class_id) REFERENCES school_class (class_id) ON DELETE SET NULL;


-- =============================================================
--  TABLE : difficulty_level
-- =============================================================

CREATE TABLE difficulty_level (
                                level_id            BIGSERIAL       PRIMARY KEY,
                                level_name          VARCHAR(50)     NOT NULL UNIQUE,
                                description         TEXT,
                                progression_order   INTEGER         NOT NULL UNIQUE
                                  CHECK (progression_order > 0)
);

COMMENT ON TABLE difficulty_level IS
    'Juggling difficulty levels ordered by progression_order.';


-- =============================================================
--  TABLE : category
-- =============================================================

CREATE TABLE category (
                        category_id     BIGSERIAL       PRIMARY KEY,
                        category_name   VARCHAR(100)    NOT NULL UNIQUE,
                        description     TEXT,
                        icon            VARCHAR(50)
);

COMMENT ON TABLE category IS 'Trick categories (3 balls, scarves, clubs, etc.)';


-- =============================================================
--  TABLE : trick
-- =============================================================

CREATE TABLE trick (
                     trick_id                    BIGSERIAL       PRIMARY KEY,
                     trick_name                  VARCHAR(255)    NOT NULL UNIQUE,
                     siteswap                    VARCHAR(100),
                     description                 TEXT,
                     juggling_lab_animation_url  TEXT,
                     difficulty_score            INTEGER
                       CHECK (difficulty_score BETWEEN 1 AND 10),
                     estimated_learning_duration INTEGER
                       CHECK (estimated_learning_duration > 0),
                     popular                     BOOLEAN         NOT NULL DEFAULT FALSE,
                     created_at                  TIMESTAMPTZ     DEFAULT NOW(),
                     level_id                    BIGINT          NOT NULL
                       REFERENCES difficulty_level (level_id) ON DELETE RESTRICT,
                     category_id                 BIGINT
                                                                 REFERENCES category (category_id) ON DELETE SET NULL
);

CREATE INDEX idx_trick_level    ON trick (level_id);
CREATE INDEX idx_trick_category ON trick (category_id);
CREATE INDEX idx_trick_popular  ON trick (popular);

COMMENT ON TABLE trick IS 'Full catalogue of juggling tricks.';


-- =============================================================
--  TABLE : prerequisite
-- =============================================================

CREATE TABLE prerequisite (
                            trick_id                BIGINT  NOT NULL
                              REFERENCES trick (trick_id) ON DELETE CASCADE,
                            prerequisite_trick_id   BIGINT  NOT NULL
                              REFERENCES trick (trick_id) ON DELETE CASCADE,

                            PRIMARY KEY (trick_id, prerequisite_trick_id),
                            CONSTRAINT chk_prerequisite_no_self
                              CHECK (trick_id <> prerequisite_trick_id)
);

COMMENT ON TABLE prerequisite IS
    'Self-referencing dependency graph between tricks.';


-- =============================================================
--  TABLE : badge_type
-- =============================================================

CREATE TABLE badge_type (
                          badge_type_id   BIGSERIAL       PRIMARY KEY,
                          type_name       VARCHAR(100)    NOT NULL UNIQUE,
                          description     TEXT,
                          color           VARCHAR(7)
);

COMMENT ON TABLE badge_type IS 'Badge categories (level, milestone, thematic, consistency).';


-- =============================================================
--  TABLE : badge
-- =============================================================

CREATE TABLE badge (
                     badge_id            BIGSERIAL       PRIMARY KEY,
                     badge_name          VARCHAR(255)    NOT NULL UNIQUE,
                     description         TEXT,
                     icon_url            TEXT,
                     unlock_criteria     TEXT            NOT NULL,
                     experience_points   INTEGER         NOT NULL DEFAULT 0
                       CHECK (experience_points >= 0),
                     difficulty_order    INTEGER
                       CHECK (difficulty_order > 0),
                     badge_type_id       BIGINT          NOT NULL
                       REFERENCES badge_type (badge_type_id) ON DELETE RESTRICT
);

CREATE INDEX idx_badge_type       ON badge (badge_type_id);
CREATE INDEX idx_badge_diff_order ON badge (difficulty_order);

COMMENT ON TABLE badge IS
    'Catalogue of unlockable badges. '
    'unlock_criteria stored as JSON text — parsed by BadgeService.';


-- =============================================================
--  TABLE : user_badge
-- =============================================================

CREATE TABLE user_badge (
                          user_badge_id   BIGSERIAL   PRIMARY KEY,
                          user_id         BIGINT      NOT NULL
                            REFERENCES users (id) ON DELETE CASCADE,
                          badge_id        BIGINT      NOT NULL
                            REFERENCES badge (badge_id) ON DELETE CASCADE,
                          unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
                          notified        BOOLEAN     NOT NULL DEFAULT FALSE,

                          CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badge_user     ON user_badge (user_id);
CREATE INDEX idx_user_badge_unlocked ON user_badge (unlocked_at DESC);

COMMENT ON TABLE user_badge IS 'Badges earned by each user.';


-- =============================================================
--  TABLE : user_progress
-- =============================================================

CREATE TABLE user_progress (
                             progress_id         BIGSERIAL       PRIMARY KEY,
                             user_id             BIGINT          NOT NULL
                               REFERENCES users (id) ON DELETE CASCADE,
                             trick_id            BIGINT          NOT NULL
                               REFERENCES trick (trick_id) ON DELETE RESTRICT,
                             status              VARCHAR(20)     NOT NULL DEFAULT 'NOT_STARTED'
                               CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'MASTERED')),
                             mastery_percentage  INTEGER         NOT NULL DEFAULT 0
                               CHECK (mastery_percentage BETWEEN 0 AND 100),
                             attempt_count       INTEGER         NOT NULL DEFAULT 0
                               CHECK (attempt_count >= 0),
                             started_at          TIMESTAMPTZ     DEFAULT NOW(),
                             mastered_at         TIMESTAMPTZ,
                             last_practice       TIMESTAMPTZ,

                             CONSTRAINT uq_user_trick   UNIQUE (user_id, trick_id),
                             CONSTRAINT chk_mastered_at CHECK (
                               mastered_at IS NULL OR mastered_at >= started_at
                               )
);

CREATE INDEX idx_user_progress_user      ON user_progress (user_id);
CREATE INDEX idx_user_progress_trick     ON user_progress (trick_id);
CREATE INDEX idx_user_progress_status    ON user_progress (status);
CREATE INDEX idx_user_progress_composite ON user_progress (user_id, status);

COMMENT ON TABLE user_progress IS
    'Detailed per-trick learning progress per user.';


-- =============================================================
--  TABLE : gdpr_consent
-- =============================================================

CREATE TABLE gdpr_consent (
                            consent_id          BIGSERIAL       PRIMARY KEY,
                            user_id             BIGINT          NOT NULL
                              REFERENCES users (id) ON DELETE CASCADE,
                            consent_type        VARCHAR(30)     NOT NULL
                              CHECK (consent_type IN (
                                                      'DATA_USAGE',
                                                      'COMMUNICATION',
                                                      'COOKIES',
                                                      'PARENTAL_MINOR'
                                )),
                            consent_given       BOOLEAN         NOT NULL,
                            consent_at          TIMESTAMPTZ     DEFAULT NOW(),
                            policy_version      VARCHAR(20)     NOT NULL,
                            ip_address          VARCHAR(45),
                            legal_guardian_id   BIGINT
                                                                REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_gdpr_consent_user ON gdpr_consent (user_id);
CREATE INDEX idx_gdpr_consent_type ON gdpr_consent (consent_type);

COMMENT ON TABLE gdpr_consent IS
    'Full GDPR consent traceability.';


-- =============================================================
--  TABLE : learning_path
-- =============================================================

CREATE TABLE learning_path (
                             learning_path_id        BIGSERIAL       PRIMARY KEY,
                             path_name               VARCHAR(255)    NOT NULL,
                             description             TEXT,
                             target_level            VARCHAR(20)     NOT NULL
                               CHECK (target_level IN (
                                                       'BEGINNER',
                                                       'INTERMEDIATE',
                                                       'ADVANCED',
                                                       'EXPERT'
                                 )),
                             estimated_duration_days INTEGER
                               CHECK (estimated_duration_days > 0),
                             active                  BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_learning_path_level  ON learning_path (target_level);
CREATE INDEX idx_learning_path_active ON learning_path (active);

COMMENT ON TABLE learning_path IS
    'Structured pedagogical learning paths assignable to classes.';


-- =============================================================
--  TABLE : learning_path_step
-- =============================================================

CREATE TABLE learning_path_step (
                                  step_id             BIGSERIAL   PRIMARY KEY,
                                  learning_path_id    BIGINT      NOT NULL
                                    REFERENCES learning_path (learning_path_id) ON DELETE CASCADE,
                                  trick_id            BIGINT      NOT NULL
                                    REFERENCES trick (trick_id) ON DELETE RESTRICT,
                                  step_order          INTEGER     NOT NULL
                                    CHECK (step_order > 0),
                                  instructions        TEXT,
                                  min_practice_time   INTEGER
                                    CHECK (min_practice_time > 0),

                                  CONSTRAINT uq_step_order UNIQUE (learning_path_id, step_order),
                                  CONSTRAINT uq_step_trick UNIQUE (learning_path_id, trick_id)
);

CREATE INDEX idx_lp_step_path ON learning_path_step (learning_path_id);

COMMENT ON TABLE learning_path_step IS
    'Ordered steps within a learning path.';


-- =============================================================
--  TABLE : class_learning_path
-- =============================================================

CREATE TABLE class_learning_path (
                                   class_learning_path_id  BIGSERIAL   PRIMARY KEY,
                                   learning_path_id        BIGINT      NOT NULL
                                     REFERENCES learning_path (learning_path_id) ON DELETE CASCADE,
                                   class_id                BIGINT      NOT NULL
                                     REFERENCES school_class (class_id) ON DELETE CASCADE,
                                   start_date              DATE        NOT NULL,
                                   expected_end_date       DATE,

                                   CONSTRAINT uq_class_path UNIQUE (learning_path_id, class_id),
                                   CONSTRAINT chk_end_date  CHECK (
                                     expected_end_date IS NULL OR expected_end_date >= start_date
                                     )
);

COMMENT ON TABLE class_learning_path IS
    'Association between a learning path and a class with a validity period.';
