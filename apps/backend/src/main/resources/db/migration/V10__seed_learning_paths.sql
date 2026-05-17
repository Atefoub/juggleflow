-- =============================================================
-- V8 — Parcours pédagogiques et figures complémentaires (démo)
-- =============================================================

INSERT INTO trick (level_id, category_id, trick_name, siteswap, description,
                   difficulty_score, estimated_learning_duration, popular) VALUES
    (1, 1, 'Columns (2 balls)',     '2',   'Two balls juggled in parallel vertical columns in one hand.', 2, 120, FALSE),
    (1, 1, 'Two in one hand',       '3',   'Three throws in one hand while the other holds a ball.',      4, 200, FALSE),
    (2, 1, 'Reverse cascade',       '3',   'Cascade with throws directed toward the outside.',            6, 360, FALSE),
    (2, 2, 'Scarf cascade',         '3',   'Slow scarf pattern for beginners.',                           1, 90,  FALSE);

-- Fondamentaux — 3 balles (tricks 1,2,3,4,9,10)
INSERT INTO learning_path (path_name, description, target_level, estimated_duration_days, active)
VALUES (
    'Fondamentaux — 3 balles',
    'Parcours d''initiation aux figures essentielles à 3 balles.',
    'BEGINNER',
    42,
    TRUE
);

INSERT INTO learning_path_step (learning_path_id, trick_id, step_order)
SELECT lp.learning_path_id, t.trick_id, t.ord
FROM learning_path lp
CROSS JOIN (
    VALUES (1, 1), (2, 2), (3, 3), (4, 4), (8, 5), (9, 6)
) AS t(trick_id, ord)
WHERE lp.path_name = 'Fondamentaux — 3 balles';

-- Foulards — Initiation
INSERT INTO learning_path (path_name, description, target_level, estimated_duration_days, active)
VALUES (
    'Foulards — Initiation',
    'Découverte du jonglage au rythme lent avec foulards.',
    'BEGINNER',
    28,
    TRUE
);

INSERT INTO learning_path_step (learning_path_id, trick_id, step_order)
SELECT lp.learning_path_id, t.trick_id, t.ord
FROM learning_path lp
CROSS JOIN (VALUES (11, 1), (1, 2)) AS t(trick_id, ord)
WHERE lp.path_name = 'Foulards — Initiation';

-- Figures avancées — Cycle 3
INSERT INTO learning_path (path_name, description, target_level, estimated_duration_days, active)
VALUES (
    'Figures avancées — Cycle 3',
    'Progression vers des figures techniques pour CM1–CM2.',
    'INTERMEDIATE',
    70,
    TRUE
);

INSERT INTO learning_path_step (learning_path_id, trick_id, step_order)
SELECT lp.learning_path_id, t.trick_id, t.ord
FROM learning_path lp
CROSS JOIN (VALUES (4, 1), (5, 2), (6, 3), (7, 4)) AS t(trick_id, ord)
WHERE lp.path_name = 'Figures avancées — Cycle 3';
