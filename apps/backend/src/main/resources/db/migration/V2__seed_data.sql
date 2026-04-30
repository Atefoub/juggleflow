-- =============================================================
-- JuggleFlow — Seed data
-- Flyway migration V2 — données de référence initiales
--
-- Séparées du schéma (V1) pour pouvoir être rejouées ou skippées
-- indépendamment selon l'environnement (prod vs test).
-- =============================================================

-- difficulty_level
INSERT INTO difficulty_level (level_name, description, progression_order) VALUES
                                                                            ('Beginner',     'Basic tricks to discover juggling',               1),
                                                                            ('Intermediate', 'Tricks requiring mastery of the basics',          2),
                                                                            ('Advanced',     'Complex tricks with advanced technique',          3),
                                                                            ('Expert',       'Highly technical tricks for experienced jugglers',4);

-- category
INSERT INTO category (category_name, description, icon) VALUES
                                                          ('3 Balls',         '3-ball juggling tricks',              '🎯'),
                                                          ('Scarves',         'Scarf juggling (slower pace)',         '🎀'),
                                                          ('Clubs',           'Club juggling',                       '🎪'),
                                                          ('Advanced Tricks', 'Technical and spectacular tricks',    '⭐');

-- badge_type
INSERT INTO badge_type (type_name, description, color) VALUES
                                                         ('Level',       'Level progression badges',             '#FFD700'),
                                                         ('Milestone',   'Badges for major achievements',        '#C0C0C0'),
                                                         ('Thematic',    'Special thematic badges',              '#CD7F32'),
                                                         ('Consistency', 'Regularity and perseverance badges',   '#4169E1');

-- badge
INSERT INTO badge (badge_type_id, badge_name, description, unlock_criteria, experience_points, difficulty_order) VALUES
                                                                                                                   (1, 'First Step',     'Master your first trick',      '{"type":"tricks_mastered","count":1}',     10,  1),
                                                                                                                   (1, 'Bronze Juggler', 'Master 5 tricks',              '{"type":"tricks_mastered","count":5}',     50,  2),
                                                                                                                   (1, 'Silver Juggler', 'Master 15 tricks',             '{"type":"tricks_mastered","count":15}',   150,  3),
                                                                                                                   (1, 'Gold Juggler',   'Master 30 tricks',             '{"type":"tricks_mastered","count":30}',   300,  4),
                                                                                                                   (2, 'Marathon',       'Practice for 100 hours total', '{"type":"practice_time","minutes":6000}', 200,  5),
                                                                                                                   (4, 'Perseverant',    'Log in 7 days in a row',       '{"type":"consecutive_days","count":7}',    75,  3);

-- trick (level_id : 1=Beginner 2=Intermediate 3=Advanced 4=Expert)
INSERT INTO trick (level_id, category_id, trick_name, siteswap, description,
                   difficulty_score, estimated_learning_duration, popular) VALUES
                                                                             (1, 1, 'Cascade (3 balls)',     '3',            'The fundamental 3-ball juggling pattern. Each ball follows a bell-curve arc alternating from hand to hand.',                               2, 180, TRUE),
                                                                             (1, 1, 'Shower',                '51',           'Balls travel up in an arc on one side and come straight down on the other. One hand always throws high; the other catches.',               3, 240, FALSE),
                                                                             (2, 1, 'Half-Shower',           '42',           'One hand throws in an arc toward the other (like the Shower) while the other hand throws its ball in a column caught by the same hand.',  5, 300, FALSE),
                                                                             (2, 1, 'Mills Mess',            '3',            'Spectacular Cascade variation with arms crossing and uncrossing in rhythm. Same siteswap as the Cascade.',                                 7, 600, TRUE),
                                                                             (3, 1, 'Cascade 441',           '441',          'Cascade variation with two higher throws followed by a standard throw, creating a brief moment of suspension.',                            6, 400, FALSE),
                                                                             (3, 1, 'Box',                   '(4,2x)(2x,4)', 'Synchronous box-shaped pattern: two balls rise simultaneously while the third passes laterally between the hands.',                        8, 720, FALSE),
                                                                             (4, 1, 'Rubenstein''s Revenge', NULL,           'Expert-level Mills Mess derivative with inverted crossed throws. No universally accepted siteswap notation.',                             9, 900, FALSE);

-- prerequisite
-- IDs séquentiels : Cascade=1, Shower=2, Half-Shower=3, Mills Mess=4, Cascade 441=5, Box=6, Rubenstein's Revenge=7
INSERT INTO prerequisite (trick_id, prerequisite_trick_id) VALUES
                                                             (3, 1),   -- Half-Shower requires Cascade
                                                             (4, 1),   -- Mills Mess requires Cascade
                                                             (5, 1),   -- Cascade 441 requires Cascade
                                                             (6, 5),   -- Box requires Cascade 441
                                                             (7, 4);   -- Rubenstein's Revenge requires Mills Mess
