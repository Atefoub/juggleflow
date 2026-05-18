-- Ressources pédagogiques curées (liens externes vérifiés).
-- Désactive les entrées sans URL ; ajoute vidéos, exercices, sources neuro et contenus enseignant.

UPDATE pedagogical_resource
SET active = false
WHERE resource_url IS NULL
  AND (
    (audience = 'STUDENT' AND resource_type IN ('STUDENT_VIDEO', 'STUDENT_EXERCISE', 'BRAIN_MODULE'))
    OR (audience = 'TEACHER' AND resource_type IN ('TEACHER_VIDEO', 'STUDY_PDF'))
    OR (
      audience = 'TEACHER'
      AND resource_type = 'TEACHER_GUIDE'
      AND (tags IS NULL OR tags NOT LIKE '%Fiche%')
    )
  );

-- ── Enseignant : études (articles scientifiques) ──
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
SELECT v.audience, v.resource_type, v.title, v.subtitle, v.meta_label, v.resource_url, v.tags, v.sort_order
FROM (VALUES
    ('TEACHER', 'STUDY_PDF',
     'Plasticité cérébrale et apprentissage du jonglage (Draganski)',
     'PLOS ONE · 2008 — augmentation de matière grise (hMT/V5)',
     'Article', 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0002669',
     'Neurosciences,Recherche', 1),
    ('TEACHER', 'STUDY_PDF',
     'Neuroplasticité et apprentissage moteur',
     'PMC · revue des mécanismes de la prise d''habileté motrice',
     'Article', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3217208/',
     'Neurosciences,Motricité', 2),
    ('TEACHER', 'STUDY_PDF',
     'Plasticité neuronale lors du jonglage',
     'ScienceDirect · intégration cérébrale et attention',
     'Article', 'https://www.sciencedirect.com/science/article/abs/pii/S0166432817303613',
     'Concentration,Recherche', 3)
) AS v(audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM pedagogical_resource p
    WHERE p.audience = v.audience AND p.title = v.title
);

-- ── Enseignant : vidéos formation ──
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
SELECT v.audience, v.resource_type, v.title, v.subtitle, v.meta_label, v.resource_url, v.tags, v.sort_order
FROM (VALUES
    ('TEACHER', 'TEACHER_VIDEO',
     'Enseigner la cascade — progression par paliers',
     'NetJuggler · 1 balle → 2 balles → 3 balles',
     '~12 min', 'https://www.youtube.com/watch?v=1AwZr-uhuZ8',
     'Débutant,Formation', 1),
    ('TEACHER', 'TEACHER_VIDEO',
     'Cascade 3 balles — tutoriel détaillé',
     'Les Tutos d''Acro Roquettes',
     '~15 min', 'https://www.youtube.com/watch?v=cDTF4qOvbrs',
     'Débutant,Formation', 2),
    ('TEACHER', 'TEACHER_VIDEO',
     'How to Juggle 3 Balls — erreurs fréquentes',
     'Taylor Glenn · en anglais, très pédagogique',
     '~18 min', 'https://www.youtube.com/watch?v=dCYDZDlcO6g',
     'Débutant,Formation', 3)
) AS v(audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM pedagogical_resource p WHERE p.audience = 'TEACHER' AND p.title = v.title
);

-- ── Enseignant : guides et sites de référence ──
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
SELECT v.audience, v.resource_type, v.title, v.subtitle, v.meta_label, v.resource_url, v.tags, v.sort_order
FROM (VALUES
    ('TEACHER', 'TEACHER_GUIDE',
     'Library of Juggling',
     'Animations et notices pour chaque figure (référence mondiale)',
     'Site', 'https://libraryofjuggling.com',
     'Catalogue,EPS', 1),
    ('TEACHER', 'TEACHER_GUIDE',
     'JuggleQuip — Apprendre 3 balles',
     'Progression par nombre de lancers réussis',
     'Site', 'https://www.jugglequip.com/post/how-to-juggle-3-balls',
     'Débutant,Progression', 2),
    ('TEACHER', 'TEACHER_GUIDE',
     'Jonglerie.ca — Tutoriels 3 balles',
     '27 trucs courts en 3 étapes (français)',
     'Site', 'https://jonglerie.ca/tutoriels-de-trucs-a-3-balles',
     'Français,Trucs', 3),
    ('TEACHER', 'TEACHER_GUIDE',
     'Chaîne Taylor Glenn',
     'Tutoriels professionnels en anglais',
     'YouTube', 'https://www.youtube.com/@TaylorGlennJuggler',
     'Chaîne,YouTube', 4),
    ('TEACHER', 'TEACHER_GUIDE',
     'Chaîne NetJuggler',
     'Tutos structurés en français',
     'YouTube', 'https://www.youtube.com/@NetJuggler',
     'Chaîne,Français', 5)
) AS v(audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM pedagogical_resource p WHERE p.audience = 'TEACHER' AND p.title = v.title
);

-- ── Élève : vidéos ──
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
SELECT v.audience, v.resource_type, v.title, v.subtitle, v.meta_label, v.resource_url, v.tags, v.sort_order
FROM (VALUES
    ('STUDENT', 'STUDENT_VIDEO',
     'Cascade 3 balles — tutoriel complet',
     'Les Tutos d''Acro Roquettes',
     'FR · progressif', 'https://www.youtube.com/watch?v=cDTF4qOvbrs',
     'Débutant,FR,Cascade', 1),
    ('STUDENT', 'STUDENT_VIDEO',
     'Jongler à 3 balles — étape par étape',
     'NetJuggler',
     'FR · 1→2→3 balles', 'https://www.youtube.com/watch?v=1AwZr-uhuZ8',
     'Débutant,FR,Cascade', 2),
    ('STUDENT', 'STUDENT_VIDEO',
     'La Douche — étape par étape',
     'Tutoriel jonglerie 001',
     'FR · Douche', 'https://www.youtube.com/watch?v=7aP-W6CzzI4',
     'Débutant,FR,Douche', 3),
    ('STUDENT', 'STUDENT_VIDEO',
     'How to Juggle 3 Balls',
     'Taylor Glenn · dépannage des erreurs',
     'EN · Cascade', 'https://www.youtube.com/watch?v=dCYDZDlcO6g',
     'Débutant,EN,Cascade', 4),
    ('STUDENT', 'STUDENT_VIDEO',
     'Easy 3-Ball Tricks (slow motion)',
     'Plusieurs figures en ralenti',
     'EN · Ralenti', 'https://www.youtube.com/watch?v=SSbNtVfMdgM',
     'Intermédiaire,EN,Ralenti', 5),
    ('STUDENT', 'STUDENT_VIDEO',
     '10 premiers tricks à apprendre',
     'Cascade, Over the top, Tennis…',
     'EN · Débutant+', 'https://www.youtube.com/watch?v=wIv46r-TvZo',
     'Débutant,EN,Trucs', 6)
) AS v(audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM pedagogical_resource p WHERE p.audience = 'STUDENT' AND p.title = v.title
);

-- ── Élève : exercices guidés (liens vers sites / vidéos) ──
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
SELECT v.audience, v.resource_type, v.title, v.subtitle, v.meta_label, v.resource_url, v.tags, v.sort_order
FROM (VALUES
    ('STUDENT', 'STUDENT_EXERCISE',
     'Cascade — fiche Library of Juggling',
     'Lis la notice puis reproduis les lancers à la maison ou en classe.',
     '10–15 min', 'https://libraryofjuggling.com/Tricks/Cascade',
     'Débutant,Cascade', 1),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Progression 3 balles (JuggleQuip)',
     'Objectif : enchaîner 3, puis 4, puis 5 lancers sans les faire tomber.',
     '15 min', 'https://www.jugglequip.com/post/how-to-juggle-3-balls',
     'Débutant,Progression', 2),
    ('STUDENT', 'STUDENT_EXERCISE',
     '60 tricks faciles au difficile',
     'Choisis une figure vue en vidéo et entraîne-toi en slow motion.',
     '20 min', 'https://www.youtube.com/watch?v=G00pqN-Gt5o',
     'Intermédiaire,Ralenti', 3),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Tutoriel court — Ben & Gabzy',
     'Un truc en 3 étapes (50 s à 2 min) sur jonglerie.ca.',
     '5–10 min', 'https://jonglerie.ca/tutoriels-de-trucs-a-3-balles',
     'Français,Trucs', 4),
    ('STUDENT', 'STUDENT_EXERCISE',
     'La Douche — notice officielle',
     'Étudie le schéma puis tente 20 lancers de chaque côté.',
     '10 min', 'https://libraryofjuggling.com/Tricks/Shower',
     'Débutant,Douche', 5)
) AS v(audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM pedagogical_resource p WHERE p.audience = 'STUDENT' AND p.title = v.title
);

-- ── Module cerveau (carte principale — une seule entrée active) ──
UPDATE pedagogical_resource
SET active = false
WHERE audience = 'STUDENT' AND resource_type = 'BRAIN_MODULE';

UPDATE pedagogical_resource
SET active = true,
    title = 'Comment ton cerveau apprend à jongler ?',
    subtitle = 'Découvre ce qui se passe dans ta tête quand tu t''entraînes — sources scientifiques vérifiables.',
    meta_label = '3 chapitres · ~10 min'
WHERE id = (
    SELECT MIN(id) FROM pedagogical_resource
    WHERE audience = 'STUDENT' AND resource_type = 'BRAIN_MODULE'
);

-- Sources par chapitre (tag brain-chapter:N — masquées de l''onglet Exercices)
INSERT INTO pedagogical_resource
    (audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
SELECT v.audience, v.resource_type, v.title, v.subtitle, v.meta_label, v.resource_url, v.tags, v.sort_order
FROM (VALUES
    ('STUDENT', 'STUDENT_EXERCISE',
     'Étude Draganski — matière grise et jonglage',
     'Augmentation transitoire du cortex visuel du mouvement (hMT/V5) après apprentissage de la cascade.',
     'PLOS ONE', 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0002669',
     'brain-chapter:1,Source', 101),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Mémoire motrice et entraînement',
     'Des changements cérébraux dès 7 jours de pratique ; consolidation par la répétition.',
     'PMC / NIH', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3217208/',
     'brain-chapter:2,Source', 102),
    ('STUDENT', 'STUDENT_EXERCISE',
     'Attention et coordination des hémisphères',
     'Le jonglage sollicite traitement simultané et communication entre les deux côtés du cerveau.',
     'ScienceDirect', 'https://www.sciencedirect.com/science/article/abs/pii/S0166432817303613',
     'brain-chapter:3,Source', 103)
) AS v(audience, resource_type, title, subtitle, meta_label, resource_url, tags, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM pedagogical_resource p WHERE p.title = v.title AND p.audience = 'STUDENT'
);
