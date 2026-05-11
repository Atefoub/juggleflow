-- =============================================================
-- JuggleFlow - Assignation de parcours par eleve (sous-ensemble)
-- Flyway migration V8
--
-- Aujourd'hui un enseignant assigne un parcours a TOUTE une classe
-- via class_learning_path (V1). Cette migration ajoute la possibilite
-- d'assigner un parcours a un SOUS-ENSEMBLE d'eleves d'une classe.
--
-- Strategie de coexistence :
--   - source = 'CLASS'      => assignation derivee d'une entree
--                              class_learning_path (vue agregee).
--   - source = 'INDIVIDUAL' => assignation directe a un eleve, sans
--                              entree class_learning_path correspondante.
--   - Cote eleve, GET /api/eleve/learning-paths fait l'union des deux
--     sources (distinct sur learning_path_id).
--
-- L'index unique (learning_path_id, student_id) garantit qu'un eleve
-- ne voit jamais le meme parcours en double.
-- =============================================================

CREATE TABLE learning_path_student_assignment (
    id                  BIGSERIAL   PRIMARY KEY,
    learning_path_id    BIGINT      NOT NULL
        REFERENCES learning_path (learning_path_id) ON DELETE CASCADE,
    student_id          BIGINT      NOT NULL
        REFERENCES student (id) ON DELETE CASCADE,
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source              VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL'
        CHECK (source IN ('CLASS', 'INDIVIDUAL')),
    CONSTRAINT uq_path_student UNIQUE (learning_path_id, student_id)
);

CREATE INDEX idx_lp_assignment_student ON learning_path_student_assignment (student_id);
CREATE INDEX idx_lp_assignment_path    ON learning_path_student_assignment (learning_path_id);

COMMENT ON TABLE learning_path_student_assignment IS
    'Assignation d''un parcours a un eleve (sous-ensemble d''une classe). Voir LearningPathService.getMyAssignedPaths pour l''union avec class_learning_path.';
