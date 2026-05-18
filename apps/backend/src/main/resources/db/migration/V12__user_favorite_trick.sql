-- Favoris élève : figures marquées dans le catalogue

CREATE TABLE user_favorite_trick (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    trick_id    BIGINT      NOT NULL REFERENCES trick (trick_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_favorite_trick UNIQUE (user_id, trick_id)
);

CREATE INDEX idx_user_favorite_user ON user_favorite_trick (user_id);
CREATE INDEX idx_user_favorite_trick ON user_favorite_trick (trick_id);
