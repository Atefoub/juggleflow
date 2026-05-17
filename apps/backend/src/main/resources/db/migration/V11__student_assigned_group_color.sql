-- Groupe pédagogique assigné manuellement par l'enseignant (wireframe 11).
-- NULL = calcul automatique selon la progression (>= 70 % VERT, >= 40 % ORANGE, sinon ROUGE).

ALTER TABLE student
    ADD COLUMN assigned_group_color VARCHAR(10);

ALTER TABLE student
    ADD CONSTRAINT chk_student_assigned_group_color
        CHECK (assigned_group_color IS NULL
            OR assigned_group_color IN ('VERT', 'ORANGE', 'ROUGE'));
