-- =============================================================
-- V17 — Enrichissement pédagogique FR : figures, parcours,
-- défis du jour, badges, ressources, module cerveau
-- =============================================================

-- ── Niveaux et catégories (libellés FR, clés API inchangées) ──
UPDATE difficulty_level SET description = CASE level_name
    WHEN 'Beginner'     THEN 'Figures pour découvrir le jonglage et les bases à 3 balles'
    WHEN 'Intermediate' THEN 'Figures demandant une cascade stable et de la coordination'
    WHEN 'Advanced'     THEN 'Motifs techniques avec siteswaps ou croisements des bras'
    WHEN 'Expert'       THEN 'Figures avancées pour jongleurs confirmés'
    ELSE description
END;

UPDATE category SET description = CASE category_name
    WHEN '3 Balls'         THEN 'Figures à 3 balles (cascade, fontaine, variations)'
    WHEN 'Scarves'         THEN 'Jonglage aux foulards — rythme lent, idéal pour débuter'
    WHEN 'Clubs'           THEN 'Jonglage aux massues'
    WHEN 'Advanced Tricks' THEN 'Figures techniques et spectaculaires'
    ELSE description
END;

-- ── Nouvelles figures ──
INSERT INTO trick (level_id, category_id, trick_name, siteswap, description, learning_tips,
                   difficulty_score, estimated_learning_duration, popular)
SELECT 1, 1, v.trick_name, v.siteswap, v.description, v.learning_tips::jsonb,
       v.difficulty_score, v.estimated_learning_duration, v.popular
FROM (VALUES
    ('Échange 2 balles', '2',
     'Premier pas vers la cascade : une balle dans chaque main, tu lances l''une et la rattrapes avec l''autre main. Tu apprends le rythme et le regard vers le sommet des arcs.',
     '[
        "Commence avec une balle : lance-la de la main droite vers la gauche, rattrape avec la main gauche.",
        "Inverse : main gauche vers main droite.",
        "Avec deux balles : lance la première, quand elle redescend lance la seconde vers l''autre main.",
        "Garde les lancers à hauteur du visage, pas trop bas.",
        "Quand l''échange est fluide, passe à la cascade à 3 balles."
     ]',
     1, 45, FALSE),
    ('Tennis', '3',
     'Le tennis (ou « over the top » léger) : une balle passe au-dessus des deux autres en arc large, comme un coup de tennis. Bon exercice pour sortir du schéma strict de cascade.',
     '[
        "Maîtrise d''abord une cascade régulière.",
        "Lance une balle plus haut et vers l''extérieur pendant que les deux autres continuent en cascade.",
        "Ne précipite pas : un seul « tennis » tous les 4 ou 5 lancers au début.",
        "Alterne le côté du lancer haut pour équilibrer les deux mains."
     ]',
     3, 150, TRUE),
    ('Au-dessus (Over the top)', '3',
     'Chaque lancer part vers l''extérieur (overthrow) au lieu de passer sous l''autre balle. Prépare la cascade inversée et les figures à bras croisés.',
     '[
        "Depuis la cascade : fais un lancer « au-dessus » avec la main droite, puis reviens en cascade.",
        "Ajoute le même geste avec la main gauche.",
        "Enchaîne deux overthrows d''affilée, puis trois, jusqu''à la cascade inversée continue.",
        "Regarde le sommet des balles, pas tes mains."
     ]',
     4, 200, FALSE),
    ('Moulin (Windmill)', '3',
     'Le moulin ressemble à une cascade « couchée » : les balles tournent dans un plan horizontal devant toi, avec des bras qui se croisent. Figure spectaculaire une fois la cascade inversée maîtrisée.',
     '[
        "Maîtrise la cascade inversée et le Mills Mess avant le moulin.",
        "Travaille d''abord deux balles en mouvement latéral lent.",
        "Garde les poignets souples et le rythme constant.",
        "Une séance courte mais régulière vaut mieux qu''un long bloc rare."
     ]',
     7, 480, FALSE)
) AS v(trick_name, siteswap, description, learning_tips, difficulty_score, estimated_learning_duration, popular)
WHERE NOT EXISTS (SELECT 1 FROM trick t WHERE t.trick_name = v.trick_name);

-- Prérequis des nouvelles figures
INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT t.trick_id, p.trick_id
FROM trick t, trick p
WHERE t.trick_name = 'Tennis' AND p.trick_name = 'Cascade (3 balles)'
ON CONFLICT DO NOTHING;

INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT t.trick_id, p.trick_id
FROM trick t, trick p
WHERE t.trick_name = 'Au-dessus (Over the top)' AND p.trick_name = 'Cascade (3 balles)'
ON CONFLICT DO NOTHING;

INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT t.trick_id, p.trick_id
FROM trick t, trick p
WHERE t.trick_name = 'Moulin (Windmill)' AND p.trick_name IN ('Cascade inversée', 'Mills Mess')
ON CONFLICT DO NOTHING;

-- ── Parcours : descriptions enrichies (cycles scolaires) ──
UPDATE learning_path SET
    description = '8 figures essentielles · Cycle 2 · CE1–CE2 · De l''échange à 2 balles jusqu''aux bases à 3 balles (cascade, fontaine, tennis).',
    estimated_duration_days = 42
WHERE path_name = 'Fondamentaux — 3 balles';

UPDATE learning_path SET
    description = '4 figures · Cycle 1 · GS–CP · Découverte au foulard puis transition vers les balles.',
    estimated_duration_days = 28
WHERE path_name = 'Foulards — Initiation';

UPDATE learning_path SET
    description = '7 figures · Cycle 3 · CM1–CM2 · Cascade inversée, Mills Mess, box et figures spectaculaires.',
    estimated_duration_days = 70
WHERE path_name = 'Figures avancées — Cycle 3';

-- Reconstruction des étapes (ordre pédagogique)
DELETE FROM learning_path_step lps
USING learning_path lp
WHERE lps.learning_path_id = lp.learning_path_id
  AND lp.path_name IN (
      'Fondamentaux — 3 balles',
      'Foulards — Initiation',
      'Figures avancées — Cycle 3'
  );

INSERT INTO learning_path_step (learning_path_id, trick_id, step_order)
SELECT lp.learning_path_id, t.trick_id, s.ord
FROM learning_path lp
JOIN (VALUES
    ('Fondamentaux — 3 balles', 'Échange 2 balles', 1),
    ('Fondamentaux — 3 balles', 'Colonnes (2 balles)', 2),
    ('Fondamentaux — 3 balles', 'Cascade (3 balles)', 3),
    ('Fondamentaux — 3 balles', 'Deux en une main', 4),
    ('Fondamentaux — 3 balles', 'Demi-fontaine', 5),
    ('Fondamentaux — 3 balles', 'Fontaine', 6),
    ('Fondamentaux — 3 balles', 'Tennis', 7),
    ('Fondamentaux — 3 balles', 'Cascade 441', 8),
    ('Foulards — Initiation', 'Cascade aux foulards', 1),
    ('Foulards — Initiation', 'Échange 2 balles', 2),
    ('Foulards — Initiation', 'Colonnes (2 balles)', 3),
    ('Foulards — Initiation', 'Cascade (3 balles)', 4),
    ('Figures avancées — Cycle 3', 'Demi-fontaine', 1),
    ('Figures avancées — Cycle 3', 'Cascade inversée', 2),
    ('Figures avancées — Cycle 3', 'Mills Mess', 3),
    ('Figures avancées — Cycle 3', 'Box', 4),
    ('Figures avancées — Cycle 3', 'Au-dessus (Over the top)', 5),
    ('Figures avancées — Cycle 3', 'Moulin (Windmill)', 6),
    ('Figures avancées — Cycle 3', 'Revanche de Rubenstein', 7)
) AS s(path_name, trick_name, ord) ON lp.path_name = s.path_name
JOIN trick t ON t.trick_name = s.trick_name;

-- ── Badges : libellés FR ──
UPDATE badge SET
    badge_name = 'Premiers pas',
    description = 'Maîtrise ta première figure'
WHERE badge_name = 'First Step';

UPDATE badge SET
    badge_name = 'Jongleur bronze',
    description = 'Maîtrise 5 figures'
WHERE badge_name = 'Bronze Juggler';

UPDATE badge SET
    badge_name = 'Jongleur argent',
    description = 'Maîtrise 15 figures'
WHERE badge_name = 'Silver Juggler';

UPDATE badge SET
    badge_name = 'Jongleur or',
    description = 'Maîtrise 30 figures'
WHERE badge_name = 'Gold Juggler';

UPDATE badge SET
    badge_name = 'Marathonien',
    description = '100 heures de pratique cumulées'
WHERE badge_name = 'Marathon';

UPDATE badge SET
    badge_name = 'Persévérant',
    description = '7 jours de connexion consécutifs'
WHERE badge_name = 'Perseverant';

-- ── Défis du jour (FR + figures renommées) ──
UPDATE daily_challenge SET
    title = 'Cascade × 20',
    description = 'Enchaîne 20 lancers de cascade sans casser le rythme.',
    target_trick_id = (SELECT trick_id FROM trick WHERE trick_name = 'Cascade (3 balles)')
WHERE rotation_slot = 0;

UPDATE daily_challenge SET
    title = 'Fontaine × 10',
    description = 'Réussis 10 lancers consécutifs de la Fontaine.',
    target_trick_id = (SELECT trick_id FROM trick WHERE trick_name = 'Fontaine')
WHERE rotation_slot = 1;

UPDATE daily_challenge SET
    title = 'Échauffement 5 minutes',
    description = 'Cinq minutes d''échauffement : poignets, épaules et lancers à une balle.',
    target_trick_id = NULL
WHERE rotation_slot = 2;

UPDATE daily_challenge SET
    title = 'Mills Mess — essai',
    description = 'Tente le Mills Mess : 3 cycles complets sans interruption.',
    target_trick_id = (SELECT trick_id FROM trick WHERE trick_name = 'Mills Mess')
WHERE rotation_slot = 3;

UPDATE daily_challenge SET
    title = 'Cascade 441 × 15',
    description = 'Travaille la Cascade 441 sur 15 lancers réguliers.',
    target_trick_id = (SELECT trick_id FROM trick WHERE trick_name = 'Cascade 441')
WHERE rotation_slot = 4;

UPDATE daily_challenge SET
    title = 'Concentration',
    description = 'Une session de 3 minutes en cascade sans regarder tes mains.',
    target_trick_id = (SELECT trick_id FROM trick WHERE trick_name = 'Cascade (3 balles)')
WHERE rotation_slot = 5;

UPDATE daily_challenge SET
    title = 'Défi libre',
    description = 'Choisis ta figure préférée et tente une série record. Repos bien mérité !',
    target_trick_id = NULL
WHERE rotation_slot = 6;

-- ── Ressources élève : vidéos et exercices FR ──
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
SELECT v.audience, v.resource_type, v.title, v.subtitle, v.meta_label, v.resource_url, v.tags, v.sort_order
FROM (VALUES
    ('STUDENT', 'STUDENT_VIDEO',
     'Fontaine — tutoriel pas à pas',
     'Jonglerie.ca · figure en 3 étapes',
     'FR · ~2 min', 'https://jonglerie.ca/tutoriels-de-trucs-a-3-balles',
     'Débutant,FR,Fontaine', 7),
    ('STUDENT', 'STUDENT_VIDEO',
     'Mills Mess — introduction',
     'Taylor Glenn · explication des bras croisés',
     'EN · Intermédiaire', 'https://www.youtube.com/watch?v=KpQXQO2Xy1c',
     'Intermédiaire,EN,Mills Mess', 8),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Échange 2 balles — fiche LOJ',
     'Lis la notice puis pratique 20 échanges sans faire tomber les balles.',
     '8 min', 'https://libraryofjuggling.com/Tricks/Exchange',
     'Débutant,Échange', 6),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Échauffement — lancer d''une balle',
     '5 min de lancers verticaux et d''échanges pour préparer poignets et regard.',
     '5 min', 'https://libraryofjuggling.com/Tricks/Cascade',
     'Débutant,Échauffement', 7)
) AS v(audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM pedagogical_resource p WHERE p.audience = 'STUDENT' AND p.title = v.title
);

-- Module cerveau : textes FR enrichis
UPDATE pedagogical_resource SET
    subtitle = 'Découvre ce qui se passe dans ta tête quand tu t''entraînes — 3 chapitres courts avec sources scientifiques.',
    meta_label = '3 chapitres · ~10 min'
WHERE audience = 'STUDENT' AND resource_type = 'BRAIN_MODULE' AND active = TRUE;

UPDATE pedagogical_resource SET
    title = 'Chapitre 1 — Ton cerveau change quand tu apprends',
    subtitle = 'Étude Draganski (2008) : après quelques semaines de cascade, la zone du cerveau qui suit le mouvement (hMT/V5) grossit temporairement — signe que tu apprends vraiment !'
WHERE audience = 'STUDENT' AND title LIKE '%Draganski%';

UPDATE pedagogical_resource SET
    title = 'Chapitre 2 — La répétition renforce tes circuits',
    subtitle = 'Dès 7 jours de pratique régulière, ton cerveau consolide la mémoire motrice : c''est pour ça que 10 minutes chaque jour valent mieux qu''une heure une fois par mois.'
WHERE audience = 'STUDENT' AND title LIKE '%Mémoire motrice%';

UPDATE pedagogical_resource SET
    title = 'Chapitre 3 — Attention et deux hémisphères',
    subtitle = 'Jongler oblige tes deux côtés du cerveau à coopérer : regard, mains et rythme en même temps — comme un entraînement de concentration.'
WHERE audience = 'STUDENT' AND title LIKE '%Attention%';
