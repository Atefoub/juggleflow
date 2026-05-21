-- =============================================================
-- V9 — Onboarding élève, ressources pédagogiques, licence établissement
-- =============================================================

ALTER TABLE student
    ADD COLUMN juggling_level VARCHAR(20),
    ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN student.juggling_level IS
    'Niveau déclaré à l''onboarding : BEGINNER, INTERMEDIATE, ADVANCED';

-- Paramètres établissement (singleton id=1)
CREATE TABLE establishment_settings (
    id                  BIGINT          PRIMARY KEY DEFAULT 1,
    establishment_name  VARCHAR(255)    NOT NULL DEFAULT 'École Jules Ferry',
    license_seat_cap    INTEGER         NOT NULL DEFAULT 60,
    license_expires_at  DATE,
    CONSTRAINT chk_establishment_singleton CHECK (id = 1)
);

INSERT INTO establishment_settings (id, establishment_name, license_seat_cap, license_expires_at)
VALUES (1, 'École Jules Ferry', 60, '2026-06-30');

-- Ressources pédagogiques (métadonnées ; fichiers via resource_url)
CREATE TABLE pedagogical_resource (
    resource_id         BIGSERIAL       PRIMARY KEY,
    audience            VARCHAR(20)     NOT NULL,
    resource_type       VARCHAR(40)     NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    subtitle            TEXT,
    meta_label          VARCHAR(100),
    resource_url        VARCHAR(2048),
    tags                VARCHAR(500),
    sort_order          INTEGER         NOT NULL DEFAULT 0,
    active              BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_resource_audience CHECK (audience IN ('TEACHER', 'STUDENT')),
    CONSTRAINT chk_resource_type CHECK (resource_type IN (
        'STUDY_PDF', 'TEACHER_VIDEO', 'TEACHER_GUIDE',
        'STUDENT_VIDEO', 'STUDENT_EXERCISE', 'BRAIN_MODULE'
    ))
);

CREATE INDEX idx_pedagogical_resource_audience ON pedagogical_resource (audience, active);

-- Enseignant — études PDF
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
VALUES
    ('TEACHER', 'STUDY_PDF',
     'Impact du jonglage sur la plasticité cérébrale',
     'Draganski et al., 2004 · Nature',
     '4 pages', NULL,
     'Neurosciences,Cycle 2-3', 1),
    ('TEACHER', 'STUDY_PDF',
     'Jonglage et développement de la coordination bilatérale',
     'INSERM, 2019 · Rapport de recherche',
     '12 pages', NULL,
     'Motricité,Cycle 1-2', 2),
    ('TEACHER', 'STUDY_PDF',
     'Concentration et activités d''adresse en école primaire',
     'MEN DGESCO, 2021 · Guide officiel',
     '8 pages', NULL,
     'Concentration,EPS', 3),
    ('TEACHER', 'TEACHER_VIDEO',
     'Formation enseignant — Enseigner la cascade',
     NULL, '12 min', NULL, 'Débutant', 1),
    ('TEACHER', 'TEACHER_VIDEO',
     'Gestion de classe en EPS jonglage',
     NULL, '8 min', NULL, 'Tous niveaux', 2),
    ('TEACHER', 'TEACHER_GUIDE',
     'Guide pédagogique cycle 2 — Jonglage',
     NULL, '20 pages', NULL, NULL, 1),
    ('TEACHER', 'TEACHER_GUIDE',
     'Progressions EPS — Manipulation d''objets',
     NULL, '15 pages', NULL, NULL, 2);

-- Élève — vidéos / exercices / module cerveau
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
VALUES
    ('STUDENT', 'STUDENT_VIDEO',
     'Cascade 3 balles — Tutoriel complet',
     NULL, '3 min 20 s', NULL, 'Débutant,Ralenti x0.5,Face + profil', 1),
    ('STUDENT', 'STUDENT_VIDEO',
     'La Douche — Étape par étape',
     NULL, '2 min 45 s', NULL, 'Débutant,Ralenti x0.25', 2),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Échauffement poignets', NULL, '5 min', NULL, NULL, 1),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Lancer d''une balle — Précision', NULL, '10 min', NULL, NULL, 2),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Échange 2 balles', NULL, '8 min', NULL, NULL, 3),
    ('STUDENT', 'BRAIN_MODULE',
     'Comment ton cerveau apprend à jongler ?',
     'Découvre ce qui se passe dans ta tête quand tu t''entraînes.',
     '3 chapitres · 8 min', NULL, NULL, 1);
