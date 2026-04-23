-- =============================================================
-- JuggleFlow — PostgreSQL Schema v2
-- Usage : place in /docker-entrypoint-initdb.d/01_schema.sql
-- WARNING : this file is executed ONCE on first container start.
-- If you modify this file, you MUST delete the volume to re-init:
--   docker compose down -v
-- =============================================================

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================
--  CLEANUP — reverse dependency order
-- =============================================================

DROP TABLE IF EXISTS class_learning_path     CASCADE;
DROP TABLE IF EXISTS learning_path_step      CASCADE;
DROP TABLE IF EXISTS learning_path           CASCADE;
DROP TABLE IF EXISTS prerequisite            CASCADE;
DROP TABLE IF EXISTS user_progress           CASCADE;
DROP TABLE IF EXISTS user_badge              CASCADE;
DROP TABLE IF EXISTS badge                   CASCADE;
DROP TABLE IF EXISTS badge_type              CASCADE;
DROP TABLE IF EXISTS gdpr_consent            CASCADE;
DROP TABLE IF EXISTS student                 CASCADE;
DROP TABLE IF EXISTS teacher                 CASCADE;
DROP TABLE IF EXISTS administrator           CASCADE;
DROP TABLE IF EXISTS school_class            CASCADE;
DROP TABLE IF EXISTS trick                   CASCADE;
DROP TABLE IF EXISTS category                CASCADE;
DROP TABLE IF EXISTS difficulty_level        CASCADE;
DROP TABLE IF EXISTS users                   CASCADE;

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
--  Parent table for all user types — JOINED inheritance.
--  Discriminator column : user_type
--  Maps to : com.juggleflow.backend.model.User
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
--  Maps to : com.juggleflow.backend.model.Student
--  FK id → users.id  (JOINED strategy)
-- =============================================================

CREATE TABLE student (
    id              BIGINT      PRIMARY KEY
                                REFERENCES users (id) ON DELETE CASCADE,
    class_id        BIGINT,     -- FK added after school_class creation
    school_level    VARCHAR(50),
    birth_date      DATE,
    enrollment_date DATE
);

CREATE INDEX idx_student_class ON student (class_id);

COMMENT ON TABLE student IS
    'Student-specific data. id is a FK to users (JOINED inheritance).';


-- =============================================================
--  TABLE : teacher
--  Maps to : com.juggleflow.backend.model.Teacher
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
--  Maps to : com.juggleflow.backend.model.Administrator
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
--  Maps to : com.juggleflow.backend.model.SchoolClass
--  NOTE : no School entity in JPA — school_class is standalone.
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

-- Now that school_class exists, add the FK on student
ALTER TABLE student
    ADD CONSTRAINT fk_student_class
        FOREIGN KEY (class_id) REFERENCES school_class (class_id) ON DELETE SET NULL;


-- =============================================================
--  TABLE : difficulty_level
--  Maps to : com.juggleflow.backend.model.DifficultyLevel
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
--  Maps to : com.juggleflow.backend.model.Category
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
--  Maps to : com.juggleflow.backend.model.Trick
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
                                                REFERENCES difficulty_level (level_id)
                                                ON DELETE RESTRICT,
    category_id                 BIGINT
                                                REFERENCES category (category_id)
                                                ON DELETE SET NULL
);

CREATE INDEX idx_trick_level    ON trick (level_id);
CREATE INDEX idx_trick_category ON trick (category_id);
CREATE INDEX idx_trick_popular  ON trick (popular);

COMMENT ON TABLE trick IS 'Full catalogue of juggling tricks.';


-- =============================================================
--  TABLE : prerequisite
--  Maps to : ManyToMany self-join on Trick.prerequisites
--  JoinTable name = "prerequisite"
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
    'Self-referencing dependency graph between tricks. '
    'Maps to @ManyToMany prerequisites on Trick entity.';


-- =============================================================
--  TABLE : badge_type
--  Maps to : com.juggleflow.backend.model.BadgeType
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
--  Maps to : com.juggleflow.backend.model.Badge
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
                                        REFERENCES badge_type (badge_type_id)
                                        ON DELETE RESTRICT
);

CREATE INDEX idx_badge_type          ON badge (badge_type_id);
CREATE INDEX idx_badge_diff_order    ON badge (difficulty_order);

COMMENT ON TABLE badge IS
    'Catalogue of unlockable badges. '
    'unlock_criteria stored as JSON text — parsed by BadgeService.';


-- =============================================================
--  TABLE : user_badge
--  Maps to : com.juggleflow.backend.model.UserBadge
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
--  Maps to : com.juggleflow.backend.model.UserProgress
--  Enum ProgressStatus : NOT_STARTED | IN_PROGRESS | MASTERED
-- =============================================================

CREATE TABLE user_progress (
    progress_id         BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL
                                        REFERENCES users (id) ON DELETE CASCADE,
    trick_id            BIGINT          NOT NULL
                                        REFERENCES trick (trick_id) ON DELETE RESTRICT,
    status              VARCHAR(20)     NOT NULL DEFAULT 'NOT_STARTED'
                                        CHECK (status IN
                                            ('NOT_STARTED', 'IN_PROGRESS', 'MASTERED')),
    mastery_percentage  INTEGER         NOT NULL DEFAULT 0
                                        CHECK (mastery_percentage BETWEEN 0 AND 100),
    attempt_count       INTEGER         NOT NULL DEFAULT 0
                                        CHECK (attempt_count >= 0),
    started_at          TIMESTAMPTZ     DEFAULT NOW(),
    mastered_at         TIMESTAMPTZ,
    last_practice       TIMESTAMPTZ,

    CONSTRAINT uq_user_trick    UNIQUE (user_id, trick_id),
    CONSTRAINT chk_mastered_at  CHECK (
        mastered_at IS NULL OR mastered_at >= started_at
    )
);

CREATE INDEX idx_user_progress_user      ON user_progress (user_id);
CREATE INDEX idx_user_progress_trick     ON user_progress (trick_id);
CREATE INDEX idx_user_progress_status    ON user_progress (status);
CREATE INDEX idx_user_progress_composite ON user_progress (user_id, status);

COMMENT ON TABLE user_progress IS
    'Detailed per-trick learning progress per user. '
    'status values match Java enum ProgressStatus (EnumType.STRING).';


-- =============================================================
--  TABLE : gdpr_consent
--  Maps to : com.juggleflow.backend.model.GdprConsent
--  Enum ConsentType : DATA_USAGE | COMMUNICATION | COOKIES | PARENTAL_MINOR
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
    'Full GDPR consent traceability. '
    'PARENTAL_MINOR requires legal_guardian_id. '
    'consent_type values match Java enum ConsentType (EnumType.STRING).';


-- =============================================================
--  TABLE : learning_path
--  Maps to : com.juggleflow.backend.model.LearningPath
--  Enum TargetLevel : BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
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
    'Structured pedagogical learning paths assignable to classes. '
    'target_level values match Java enum TargetLevel (EnumType.STRING).';


-- =============================================================
--  TABLE : learning_path_step
--  Maps to : com.juggleflow.backend.model.LearningPathStep
-- =============================================================

CREATE TABLE learning_path_step (
    step_id             BIGSERIAL   PRIMARY KEY,
    learning_path_id    BIGINT      NOT NULL
                                    REFERENCES learning_path (learning_path_id)
                                    ON DELETE CASCADE,
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
    'Ordered steps within a learning path. '
    'Loaded with @OrderBy("stepOrder ASC") in LearningPath entity.';


-- =============================================================
--  TABLE : class_learning_path
--  Maps to : com.juggleflow.backend.model.ClassLearningPath
-- =============================================================

CREATE TABLE class_learning_path (
    class_learning_path_id  BIGSERIAL   PRIMARY KEY,
    learning_path_id        BIGINT      NOT NULL
                                        REFERENCES learning_path (learning_path_id)
                                        ON DELETE CASCADE,
    class_id                BIGINT      NOT NULL
                                        REFERENCES school_class (class_id)
                                        ON DELETE CASCADE,
    start_date              DATE        NOT NULL,
    expected_end_date       DATE,

    CONSTRAINT uq_class_path    UNIQUE (learning_path_id, class_id),
    CONSTRAINT chk_end_date     CHECK (
        expected_end_date IS NULL OR expected_end_date >= start_date
    )
);

COMMENT ON TABLE class_learning_path IS
    'Association between a learning path and a class with a validity period. '
    'Maps to ClassLearningPath JPA entity.';


-- =============================================================
--  SEED DATA
-- =============================================================

-- difficulty_level
INSERT INTO difficulty_level (level_name, description, progression_order) VALUES
    ('Beginner',        'Basic tricks to discover juggling',                        1),
    ('Intermediate',    'Tricks requiring mastery of the basics',                   2),
    ('Advanced',        'Complex tricks with advanced technique',                   3),
    ('Expert',          'Highly technical tricks for experienced jugglers',         4);

-- category
INSERT INTO category (category_name, description, icon) VALUES
    ('3 Balls',         '3-ball juggling tricks',               '🎯'),
    ('Scarves',         'Scarf juggling (slower pace)',          '🎀'),
    ('Clubs',           'Club juggling',                        '🎪'),
    ('Advanced Tricks', 'Technical and spectacular tricks',     '⭐');

-- badge_type
INSERT INTO badge_type (type_name, description, color) VALUES
    ('Level',       'Level progression badges',              '#FFD700'),
    ('Milestone',   'Badges for major achievements',         '#C0C0C0'),
    ('Thematic',    'Special thematic badges',               '#CD7F32'),
    ('Consistency', 'Regularity and perseverance badges',    '#4169E1');

-- badge  (unlock_criteria : JSON text parsed by BadgeService)
INSERT INTO badge (badge_type_id, badge_name, description, unlock_criteria, experience_points, difficulty_order) VALUES
    (1, 'First Step',       'Master your first trick',          '{"type":"tricks_mastered","count":1}',     10,  1),
    (1, 'Bronze Juggler',   'Master 5 tricks',                  '{"type":"tricks_mastered","count":5}',     50,  2),
    (1, 'Silver Juggler',   'Master 15 tricks',                 '{"type":"tricks_mastered","count":15}',   150,  3),
    (1, 'Gold Juggler',     'Master 30 tricks',                 '{"type":"tricks_mastered","count":30}',   300,  4),
    (2, 'Marathon',         'Practice for 100 hours total',     '{"type":"practice_time","minutes":6000}', 200,  5),
    (4, 'Perseverant',      'Log in 7 days in a row',           '{"type":"consecutive_days","count":7}',    75,  3);

-- trick  (level_id 1=Beginner 2=Intermediate 3=Advanced 4=Expert)
INSERT INTO trick (level_id, category_id, trick_name, siteswap, description,
                   difficulty_score, estimated_learning_duration, popular) VALUES
    (1, 1, 'Cascade (3 balls)',       '3',              'The fundamental 3-ball juggling pattern',                      2, 180, TRUE),
    (1, 1, 'Shower',                  '51',             'Balls travel up on one side and come down on the other',       3, 240, FALSE),
    (2, 1, 'Half-Shower',             '42',             'Cascade variation — one ball does not change hands',           5, 300, FALSE),
    (2, 1, 'Mills Mess',              '3',              'Spectacular pattern with crossing arms',                       7, 600, TRUE),
    (3, 1, 'Cascade 441',             '441',            'Cascade variation with higher throws',                         6, 400, FALSE),
    (3, 1, 'Box',                     '(4,2x)(2x,4)',   'Box-shaped pattern',                                           8, 720, FALSE),
    (4, 1, 'Rubenstein''s Revenge',   '(4,2x)(2x,4)',   'Highly technical trick with complex movements',                9, 900, FALSE);

-- prerequisite  (trick_id → prerequisite_trick_id)
-- IDs are sequential from the INSERT above : Cascade=1, Shower=2, Half-Shower=3,
-- Mills Mess=4, Cascade 441=5, Box=6, Rubenstein's Revenge=7
INSERT INTO prerequisite (trick_id, prerequisite_trick_id) VALUES
    (3, 1),   -- Half-Shower requires Cascade
    (4, 1),   -- Mills Mess requires Cascade
    (5, 1),   -- Cascade 441 requires Cascade
    (6, 5),   -- Box requires Cascade 441
    (7, 4);   -- Rubenstein's Revenge requires Mills Mess


-- =============================================================
--  END
-- =============================================================

COMMIT;
