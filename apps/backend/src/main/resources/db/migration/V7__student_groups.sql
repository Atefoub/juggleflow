-- =============================================================
-- JuggleFlow - Groupes d'eleves editables cote enseignant
-- Flyway migration V7
--
-- Le champ `group_color` historique sur StudentSummaryResponse reste
-- CALCULE a la volee (VERT / ORANGE / ROUGE selon le pourcentage de
-- figures maitrisees). Ces tables y sont totalement orthogonales :
-- elles permettent au prof de constituer des groupes pedagogiques
-- NOMMES (ex. "Equipe Lundi 14h", "Niveau intermediaire") quel que
-- soit l'etat de progression des eleves.
--
-- Modele :
--   - student_group : un groupe nomme dans une classe, avec une
--     couleur libre et une position pour l'ordre d'affichage.
--   - student_group_membership : table de liaison many-to-many,
--     CASCADE des deux cotes (groupe supprime -> membership purge ;
--     eleve supprime -> membership purge).
-- =============================================================

CREATE TABLE student_group (
    id          BIGSERIAL    PRIMARY KEY,
    class_id    BIGINT       NOT NULL
        REFERENCES school_class (class_id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    color       VARCHAR(20)  NOT NULL DEFAULT 'BLEU'
        CHECK (color IN ('VERT', 'ORANGE', 'ROUGE', 'BLEU', 'VIOLET', 'JAUNE', 'GRIS')),
    position    INT          NOT NULL DEFAULT 0 CHECK (position >= 0),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_group_name_per_class UNIQUE (class_id, name)
);

CREATE INDEX idx_student_group_class ON student_group (class_id, position);

COMMENT ON TABLE student_group IS
    'Groupe pedagogique nomme dans une classe (orthogonal au group_color calcule).';
COMMENT ON COLUMN student_group.position IS
    'Ordre d''affichage cote UI (pilote par drag-and-drop).';


CREATE TABLE student_group_membership (
    group_id    BIGINT NOT NULL
        REFERENCES student_group (id) ON DELETE CASCADE,
    student_id  BIGINT NOT NULL
        REFERENCES student (id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, student_id)
);

CREATE INDEX idx_group_membership_student ON student_group_membership (student_id);

COMMENT ON TABLE student_group_membership IS
    'Appartenance d''un eleve a un groupe pedagogique. Un eleve peut etre dans plusieurs groupes.';
