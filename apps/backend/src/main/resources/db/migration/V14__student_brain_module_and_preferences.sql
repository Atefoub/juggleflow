-- Progression module neurosciences (3 chapitres) + préférence rappels de pratique

ALTER TABLE student
    ADD COLUMN practice_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN student.practice_reminders_enabled IS
    'Rappels de pratique quotidiens (préférence élève, profil).';

CREATE TABLE student_brain_module_chapter (
    user_id         BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    chapter_number  INTEGER     NOT NULL CHECK (chapter_number BETWEEN 1 AND 3),
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, chapter_number)
);

CREATE INDEX idx_brain_module_user ON student_brain_module_chapter (user_id);

COMMENT ON TABLE student_brain_module_chapter IS
    'Chapitres terminés du module BRAIN_MODULE (1 à 3).';
