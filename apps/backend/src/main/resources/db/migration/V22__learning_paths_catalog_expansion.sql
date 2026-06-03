-- =============================================================
-- V22 — 7 parcours pédagogiques pour les 30 figures V21
-- Complète le catalogue sans modifier les 3 parcours existants.
-- =============================================================

INSERT INTO learning_path (path_name, description, target_level, estimated_duration_days, active)
SELECT v.path_name, v.description, v.target_level, v.estimated_duration_days, TRUE
FROM (VALUES
    (
        'Motifs & régularité — Cycle 2',
        '5 figures · CE1–CE2 · Rythme, hauteurs et contrôle des trajectoires avant les figures techniques.',
        'BEGINNER',
        28
    ),
    (
        'Colonnes & illusions — CE2',
        '4 figures · CE2 · Fausses colonnes, yo-yo et motifs latéraux après les bases des colonnes.',
        'BEGINNER',
        28
    ),
    (
        'Fontaine & variations — CM1',
        '4 figures · CM1 · Du shower cascade à la fontaine inversée (prérequis : Fontaine maîtrisée).',
        'INTERMEDIATE',
        35
    ),
    (
        'Croisements & Boston Mess — CM1–CM2',
        '5 figures · CM1–CM2 · Bras croisés, chops et famille Boston (prérequis : Mills Mess du parcours Cycle 3).',
        'INTERMEDIATE',
        56
    ),
    (
        'Siteswaps classiques — CM2',
        '4 figures · CM2 · 423, 531, Factory et Mills Mess 441 (prérequis : Cascade 441 + Mills Mess).',
        'ADVANCED',
        49
    ),
    (
        'Barrage & takeouts — CM2+',
        '5 figures · CM2+ · Barrage de Burke, takeouts et variantes Mess avancées.',
        'ADVANCED',
        63
    ),
    (
        'Expert — famille Rubenstein',
        '3 figures · Club / option · Revanche de Relf, Roméo et suspension de Harrison (après Cycle 3).',
        'EXPERT',
        42
    )
) AS v(path_name, description, target_level, estimated_duration_days)
WHERE NOT EXISTS (
    SELECT 1 FROM learning_path lp WHERE lp.path_name = v.path_name
);

INSERT INTO learning_path_step (learning_path_id, trick_id, step_order)
SELECT lp.learning_path_id, t.trick_id, s.ord
FROM learning_path lp
JOIN (VALUES
    ('Motifs & régularité — Cycle 2',       'Chute pendule (Pendulum Drop)',           1),
    ('Motifs & régularité — Cycle 2',       'Suivre (Follow)',                        2),
    ('Motifs & régularité — Cycle 2',       'Transpalette (Forklift)',                3),
    ('Motifs & régularité — Cycle 2',       'Niveaux (Levels)',                       4),
    ('Motifs & régularité — Cycle 2',       'Cascade haut-bas (High-Low)',            5),

    ('Colonnes & illusions — CE2',          'Fausses colonnes (Fake Columns)',        1),
    ('Colonnes & illusions — CE2',          'Yo-Yo',                                  2),
    ('Colonnes & illusions — CE2',          'Sous le bras (Under the arm)',           3),
    ('Colonnes & illusions — CE2',          'Serpent (Snake)',                        4),

    ('Fontaine & variations — CM1',         'Cascade fontaine (Shower Cascade)',      1),
    ('Fontaine & variations — CM1',         'Trois en une (Three in One)',            2),
    ('Fontaine & variations — CM1',         'Statue de la Liberté',                   3),
    ('Fontaine & variations — CM1',         'Fontaine inversée (Inverted Shower)',    4),

    ('Croisements & Boston Mess — CM1–CM2', 'Cascade bras croisés (Crossed-Arm Cascade)', 1),
    ('Croisements & Boston Mess — CM1–CM2', 'Chops',                                  2),
    ('Croisements & Boston Mess — CM1–CM2', 'Demi-Mess (Half-Mess)',                  3),
    ('Croisements & Boston Mess — CM1–CM2', 'Boston Shuffle',                         4),
    ('Croisements & Boston Mess — CM1–CM2', 'Boston Mess',                            5),

    ('Siteswaps classiques — CM2',          '423 (Le W)',                             1),
    ('Siteswaps classiques — CM2',          '531',                                    2),
    ('Siteswaps classiques — CM2',          'Usine (Factory)',                        3),
    ('Siteswaps classiques — CM2',          'Mills Mess 441',                         4),

    ('Barrage & takeouts — CM2+',           'Barrage de Burke (Burke''s Barrage)',    1),
    ('Barrage & takeouts — CM2+',           'Takeouts',                               2),
    ('Barrage & takeouts — CM2+',           'Mills Mess inversé (Reverse Mills Mess)', 3),
    ('Barrage & takeouts — CM2+',           'Shuffle géorgien (Georgian Shuffle)',    4),
    ('Barrage & takeouts — CM2+',           'Glissade d''Al (Al''s Slide)',           5),

    ('Expert — famille Rubenstein',         'Revanche de Relf (Relf''s Revenge)',     1),
    ('Expert — famille Rubenstein',         'Revanche de Roméo (Romeo''s Revenge)',    2),
    ('Expert — famille Rubenstein',         'Suspension de Harrison (Harrison''s Hang)', 3)
) AS s(path_name, trick_name, ord) ON lp.path_name = s.path_name
JOIN trick t ON t.trick_name = s.trick_name
ON CONFLICT DO NOTHING;
