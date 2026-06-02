-- Assignation individuelle parcours ↔ élève (prioritaire sur l'assignation classe)

CREATE TABLE student_learning_path (
    student_learning_path_id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learning_path_id BIGINT NOT NULL REFERENCES learning_path(learning_path_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    expected_end_date DATE,
    CONSTRAINT uq_student_learning_path UNIQUE (student_id, learning_path_id),
    CONSTRAINT chk_student_path_dates CHECK (
        expected_end_date IS NULL OR expected_end_date >= start_date
    )
);

CREATE INDEX idx_student_learning_path_student ON student_learning_path(student_id);
CREATE INDEX idx_student_learning_path_path ON student_learning_path(learning_path_id);
