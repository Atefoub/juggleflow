-- =============================================================
-- V21 — Catalogue élargi : 30 figures supplémentaires
-- Sources pédagogiques : Library of Juggling (libraryofjuggling.com)
-- Niveaux : 1=Débutant 2=Intermédiaire 3=Avancé 4=Expert
-- Catégorie 1 = 3 balles
-- =============================================================

INSERT INTO trick (level_id, category_id, trick_name, siteswap, description, learning_tips,
                   difficulty_score, estimated_learning_duration, popular, juggling_lab_pattern)
SELECT v.level_id, 1, v.trick_name, v.siteswap, v.description, v.learning_tips::jsonb,
       v.difficulty_score, v.estimated_learning_duration, v.popular, v.juggling_lab_pattern
FROM (VALUES
    -- ── Débutant ──
    (1, 'Suivre (Follow)',
     '3',
     'Le Follow (suivre) : chaque balle suit la même trajectoire en arc, comme si elle « courait après » la précédente. Motif fluide idéal pour travailler la régularité des lancers.',
     '[
        "Maîtrise d''abord une cascade stable.",
        "Lance la première balle en arc classique ; la seconde doit suivre exactement le même chemin, un peu plus tard.",
        "Garde le même angle et la même hauteur pour chaque lancer.",
        "Regarde le sommet des trajectoires pour synchroniser le rythme."
     ]',
     2, 90, FALSE, NULL),

    (1, 'Transpalette (Forklift)',
     '3',
     'La transpalette (Forklift) : lance vertical net suivi d''un mouvement de « fourche » — la main attrape la balle par le dessous et relance. Excellent pour la coordination main-poignet.',
     '[
        "Commence avec une balle : lancer vertical, attraper par le dessous (scoop), relancer.",
        "Travaille les deux mains séparément avant de combiner avec une cascade.",
        "Les lancers verticaux doivent rester au centre du corps.",
        "Intègre progressivement un lancer Forklift tous les 3 ou 4 cycles de cascade."
     ]',
     2, 120, FALSE, NULL),

    (1, 'Sous le bras (Under the arm)',
     '3',
     'Le lancer sous le bras : une balle passe sous le coude pendant que les autres continuent en cascade. Première étape vers les figures à bras croisés.',
     '[
        "Depuis une cascade stable, fais passer une balle sous le bras opposé au moment du lancer.",
        "Commence par un seul lancer sous le bras tous les 5 cycles.",
        "Garde les autres lancers en cascade normale — ne bloque pas la main libre.",
        "Alterne gauche et droite pour équilibrer."
     ]',
     3, 150, FALSE, NULL),

    (1, 'Chute pendule (Pendulum Drop)',
     '3',
     'La chute pendule : au lieu de lancer, tu laisses tomber une balle d''une main vers l''autre en arc pendulaire. Figure d''échauffement pour sentir le rythme sans effort de lancer.',
     '[
        "Tiens deux balles dans une main, une dans l''autre.",
        "Laisse tomber la balle de la main pleine vers l''autre main en arc large.",
        "Rattrape au bon moment et laisse retomber la suivante.",
        "Une fois le rythme trouvé, remplace la chute par un lancer léger."
     ]',
     1, 60, FALSE, NULL),

    (1, 'Fausses colonnes (Fake Columns)',
     '4',
     'Les fausses colonnes : deux balles semblent monter en colonnes parallèles, mais l''une est en réalité passée horizontalement. Prépare la Box et le travail en colonnes synchrones.',
     '[
        "Maîtrise les colonnes à 2 balles avant cette figure.",
        "À 2 balles : une colonne verticale + une passe horizontale simultanée.",
        "L''illusion repose sur le timing : les deux mouvements partent en même temps.",
        "Ajoute la 3ᵉ balle quand le motif à 2 balles est fluide."
     ]',
     3, 180, FALSE, NULL),

    (1, 'Yo-Yo',
     '3',
     'Le Yo-Yo (variation des fausses colonnes) : une balle monte et redescend sur place pendant que l''autre main passe une balle horizontalement. Motif lent et visuel.',
     '[
        "Travaille d''abord les fausses colonnes.",
        "Une main fait un lancer vertical court (yo-yo) ; l''autre passe au même instant.",
        "Garde le yo-yo bien vertical, sans dérive latérale.",
        "Enchaîne 3 yo-yos puis une passe, puis reviens en cascade."
     ]',
     3, 150, FALSE, NULL),

    (1, 'Cascade haut-bas (High-Low)',
     '3',
     'Variation de la cascade : alterner des lancers hauts et bas tout en gardant le siteswap 3. Développe le contrôle de hauteur et prépare les multiplex.',
     '[
        "Depuis une cascade : un lancer haut (au-dessus de la tête), puis un lancer bas (au niveau de la poitrine).",
        "Alterne haut-bas-haut en gardant le rythme constant.",
        "Les lancers bas ne doivent pas être précipités — garde le tempo.",
        "Travaille les deux mains de façon symétrique."
     ]',
     2, 120, FALSE, NULL),

    (1, 'Niveaux (Levels)',
     '3',
     'Les niveaux (Levels) : les trois balles tournent à des hauteurs différentes — une haute, une moyenne, une basse — en cascade. Travail fin du contrôle de trajectoire.',
     '[
        "Assigne mentalement un niveau à chaque balle : haut, milieu, bas.",
        "Commence avec 3 lancers consécutifs à 3 hauteurs différentes, puis rattrape.",
        "Ne change pas l''ordre des hauteurs à chaque cycle.",
        "Une cascade stable est indispensable avant d''essayer."
     ]',
     3, 180, FALSE, NULL),

    -- ── Intermédiaire ──
    (2, 'Serpent (Snake)',
     '3',
     'Le serpent (Snake) : les balles glissent d''un côté à l''autre du corps en trajectoires basses et horizontales, comme un serpent au sol. Motif dynamique et amusant.',
     '[
        "Maîtrise la cascade et le Follow avant le serpent.",
        "Lance les balles plus bas qu''en cascade, vers l''extérieur du corps.",
        "Le mouvement part de la hanche et progresse latéralement.",
        "Commence lentement : un « serpent » tous les 4 cycles de cascade."
     ]',
     4, 240, TRUE, NULL),

    (2, 'Chops',
     '3',
     'Les Chops : à chaque lancer de cascade, tu « coupes » la trajectoire d''une balle en l''attrapant plus tôt que prévu. Siteswap 3, mais sensation très différente.',
     '[
        "Maîtrise la cascade inversée avant les Chops.",
        "Depuis une cascade : attrape la balle juste après le sommet de sa trajectoire (chop).",
        "Fais un chop par cycle au début, puis deux, puis enchaîne.",
        "Garde les poignets souples — le chop ne doit pas casser le rythme."
     ]',
     5, 300, TRUE, NULL),

    (2, 'Boston Shuffle',
     '23',
     'Le Boston Shuffle : motif à siteswap 23 — un lancer court et un lancer plus long qui alternent. Prépare le Boston Mess et les shuffles plus complexes.',
     '[
        "Travaille d''abord le siteswap 23 à 2 balles dans une main.",
        "Ajoute la 3ᵉ balle quand le shuffle est régulier.",
        "Le lancer « 2 » est bas et rapide ; le « 3 » est un arc classique.",
        "Compte 2-3-2-3 mentalement pour garder le rythme."
     ]',
     5, 360, FALSE, NULL),

    (2, 'Cascade fontaine (Shower Cascade)',
     '42',
     'La cascade fontaine (Shower Cascade) : combine l''arc d''une demi-fontaine avec le flux de la cascade. Siteswap 42 — pont entre fontaine et cascade.',
     '[
        "Maîtrise la demi-fontaine et la cascade avant cette figure.",
        "Une main lance en arc (comme en demi-fontaine), l''autre en colonne verticale.",
        "Alterne les rôles des mains à chaque cycle.",
        "Garde le siteswap 42 : un lancer haut (4), un lancer court (2)."
     ]',
     5, 300, FALSE, NULL),

    (2, 'Cascade bras croisés (Crossed-Arm Cascade)',
     '3',
     'La cascade bras croisés : tu jongles en cascade en gardant les bras croisés en permanence. Prépare le Mills Mess et les motifs à croisements.',
     '[
        "Maîtrise la cascade inversée et le lancer sous le bras.",
        "Croise les bras et lance une cascade lente — 3 lancers puis arrêt.",
        "Augmente progressivement la durée en gardant les bras croisés.",
        "Travaille les deux configurations (main droite au-dessus / main gauche au-dessus)."
     ]',
     5, 360, FALSE, '3;hands=(-25)(2.5).(25)(-2.5).(-25)(0).'),

    (2, 'Statue de la Liberté',
     '3',
     'La Statue de la Liberté : une main tient une balle en l''air (comme une torche) pendant que l''autre jongle deux balles en colonnes. Figure iconique et photogénique.',
     '[
        "Maîtrise la fontaine et les colonnes à 2 balles.",
        "Commence avec la main dominante en colonnes (2 balles) et l''autre main qui tient la 3ᵉ balle immobile.",
        "Passe progressivement à un léger lancer « torche » au sommet.",
        "Garde le bras « torche » tendu et stable."
     ]',
     5, 300, TRUE, NULL),

    (2, 'Trois en une (Three in One)',
     '51',
     'Le trois en une (Three in One) : les trois balles tournent dans une seule main en motif de fontaine (51). L''autre main est libre. Siteswap identique à la fontaine mais exécution unilatérale.',
     '[
        "Maîtrise la fontaine à deux mains avant le trois en une.",
        "Commence avec 2 balles en fontaine dans la main dominante.",
        "Ajoute la 3ᵉ balle : lance-la quand la première revient.",
        "Travaille les deux mains — la non-dominante demandera plus de temps."
     ]',
     5, 360, FALSE, '51'),

    (2, 'Demi-Mess (Half-Mess)',
     '3',
     'Le Demi-Mess (Half-Mess) : un cycle complet de Mills Mess suivi d''un lancer de cascade classique. Pont pédagogique entre Mills Mess et motifs plus simples.',
     '[
        "Maîtrise le Mills Mess avant le Demi-Mess.",
        "Enchaîne : un cycle Mills Mess complet, puis 3 lancers de cascade normale.",
        "Alterne Mills-cascade-Mills-cascade jusqu''à ce que la transition soit fluide.",
        "Réduis progressivement les lancers de cascade intermédiaires."
     ]',
     6, 420, FALSE, '3;hands=(-25)(2.5).(25)(-2.5).(-25)(0).'),

    -- ── Avancé ──
    (3, 'Fontaine inversée (Inverted Shower)',
     '51',
     'La fontaine inversée (Inverted Shower) : comme la fontaine classique (51), mais les lancers hauts passent sous le bras au lieu de passer au-dessus. Très visuelle.',
     '[
        "Maîtrise la fontaine et le lancer sous le bras.",
        "Remplace les lancers hauts de la fontaine par des lancers sous le coude.",
        "Commence avec un lancer inversé tous les 3 cycles de fontaine.",
        "Garde le siteswap 51 — seule la trajectoire change."
     ]',
     7, 480, FALSE, '51'),

    (3, 'Mills Mess 441',
     '441',
     'Le Mills Mess 441 : combine le croisement des bras du Mills Mess avec le siteswap 441 (deux lancers hauts + un lancer bas). Figure spectaculaire et technique.',
     '[
        "Maîtrise le Mills Mess et la Cascade 441 séparément.",
        "Commence par un cycle Mills Mess, puis insère un 441 au milieu.",
        "Les lancers « 4 » du 441 doivent laisser le temps aux bras de se croiser.",
        "Travaille lentement — la hauteur des 4 est cruciale."
     ]',
     7, 540, TRUE, '441'),

    (3, 'Mills Mess inversé (Reverse Mills Mess)',
     '3',
     'Le Mills Mess inversé (Reverse Mills Mess) : même structure que le Mills Mess, mais tous les lancers partent vers l''extérieur (overthrows). Prépare les figures expert du family Mills.',
     '[
        "Maîtrise le Mills Mess et la cascade inversée.",
        "Reprends la décomposition du Mills Mess en remplaçant chaque lancer par un overthrow.",
        "Travaille un cycle complet avant d''enchaîner.",
        "Garde le flux latéral — ne retombe pas en colonnes verticales."
     ]',
     7, 540, FALSE, '3;hands=(25)(-2.5).(-25)(2.5).(25)(0).'),

    (3, 'Boston Mess',
     '3',
     'Le Boston Mess : fusion du Mills Mess et du Boston Shuffle. Les bras se croisent en rythme shuffle. Figure avancée très fluide une fois maîtrisée.',
     '[
        "Maîtrise le Mills Mess et le Boston Shuffle avant le Boston Mess.",
        "Commence par un cycle Mills Mess, puis enchaîne un Boston Shuffle.",
        "Fusionne progressivement les deux motifs en un seul enchaînement.",
        "Compte les temps : shuffle-Mess-shuffle-Mess."
     ]',
     8, 600, TRUE, '3;hands=(-25)(2.5).(25)(-2.5).(-25)(0).'),

    (3, 'Barrage de Burke (Burke''s Barrage)',
     '423',
     'Le Barrage de Burke (Burke''s Barrage) : siteswap 423 avec des bras qui se croisent et se décroisent en barrage continu. L''une des figures les plus populaires après le Mills Mess.',
     '[
        "Maîtrise le Mills Mess avant le Barrage de Burke.",
        "Décompose le 423 : lancer 4 haut, attraper, lancer 2 court, lancer 3 en arc.",
        "Ajoute le croisement des bras à chaque lancer 3.",
        "Travaille les deux sens de croisement."
     ]',
     8, 660, TRUE, '423'),

    (3, 'Usine (Factory)',
     '423',
     'L''Usine (Factory) : siteswap 423 où une balle passe systématiquement par-dessus les deux autres en arc large. Motif asymétrique très reconnaissable.',
     '[
        "Maîtrise la cascade inversée et le siteswap 423 à 3 balles.",
        "Identifie la balle « usine » : elle passe toujours au-dessus des deux autres.",
        "Les deux autres balles restent en flux bas et rapide.",
        "Travaille d''abord le 423 sans la hauteur de l''arc, puis ajoute l''arc large."
     ]',
     8, 600, TRUE, '423'),

    (3, '423 (Le W)',
     '423',
     'Le 423 (The W) : enchaînement classique du siteswap 423 — la trajectoire des balles dessine un « W » dans l''espace. Figure fondamentale du jonglage avancé à 3 balles.',
     '[
        "Maîtrise la Cascade 441 avant le 423.",
        "Compte 4-2-3 : lancer haut (4), lancer court (2), lancer moyen (3).",
        "Le lancer 2 est le plus bas et le plus rapide — ne le précipite pas.",
        "Enchaîne plusieurs cycles 423 avant d''accélérer."
     ]',
     7, 480, TRUE, '423'),

    (3, '531',
     '531',
     'Le 531 : siteswap où les hauteurs des lancers alternent 5-3-1 — un lancer très haut, un moyen, un très bas. Excellent exercice de contrôle de hauteur.',
     '[
        "Maîtrise la Cascade 441 avant le 531.",
        "Compte 5-3-1 : le 5 monte bien au-dessus de la tête, le 1 reste bas.",
        "Le lancer 1 ne doit pas être un lancer horizontal — garde une petite arc.",
        "Travaille très lentement : le contraste de hauteur est la clé."
     ]',
     7, 480, TRUE, '531'),

    (3, 'Shuffle géorgien (Georgian Shuffle)',
     '3',
     'Le shuffle géorgien (Georgian Shuffle) : motif à bras croisés avec un shuffle latéral continu. Variante élégante de la famille Mills, popularisée en Georgie.',
     '[
        "Maîtrise le Mills Mess avant le shuffle géorgien.",
        "Commence par un shuffle latéral à 2 balles bras croisés.",
        "Ajoute la 3ᵉ balle en gardant le flux horizontal.",
        "Travaille les deux sens de croisement des bras."
     ]',
     8, 600, FALSE, '3;hands=(-25)(2.5).(25)(-2.5).(-25)(0).'),

    (3, 'Takeouts',
     '423',
     'Les Takeouts : variation du Barrage de Burke où une balle est « sortie » (takeout) du motif à chaque cycle. Siteswap 423 avec une passe visible au-dessus du motif.',
     '[
        "Maîtrise le Barrage de Burke avant les Takeouts.",
        "Identifie le moment du takeout : une balle s''échappe au-dessus des deux autres.",
        "Le takeout doit être net et visible — c''est la signature de la figure.",
        "Reprends le barrage immédiatement après chaque takeout."
     ]',
     8, 660, FALSE, '423'),

    (3, 'Glissade d''Al (Al''s Slide)',
     '3',
     'La glissade d''Al (Al''s Slide) : une balle glisse le long de l''avant-bras pendant que les autres continuent en cascade inversée. Motif fluide et original.',
     '[
        "Maîtrise la cascade inversée avant la glissade d''Al.",
        "Commence avec une balle : lance, laisse glisser le long de l''avant-bras opposé, rattrape.",
        "Intègre le slide tous les 4 cycles de cascade inversée.",
        "Garde le poignet souple pour que la balle glisse naturellement."
     ]',
     7, 480, FALSE, '3;hands=(25)(-2.5).(-25)(2.5).(25)(0).'),

    -- ── Expert ──
    (4, 'Suspension de Harrison (Harrison''s Hang)',
     '3',
     'La suspension de Harrison (Harrison''s Hang) : une balle reste en suspension (hang) au sommet de sa trajectoire pendant que les autres continuent. Figure expert de timing pur.',
     '[
        "Maîtrise le Mills Mess avant la suspension de Harrison.",
        "Travaille le « hang » à 2 balles : lance haut, freeze au sommet, lance la 2ᵉ.",
        "Le hang dure une fraction de seconde — le timing est tout.",
        "Intègre le hang dans un cycle Mills Mess une fois le freeze maîtrisé."
     ]',
     9, 780, FALSE, NULL),

    (4, 'Revanche de Relf (Relf''s Revenge)',
     '522',
     'La revanche de Relf (Relf''s Revenge) : variante expert du Mills Mess avec un siteswap 522 et un mouvement circulaire des bras. Proche de la Revanche de Rubenstein mais avec un flux différent.',
     '[
        "Maîtrise le Mills Mess et la Revanche de Rubenstein.",
        "Décompose le 522 : deux lancers moyens (5 et 2) puis un lancer bas (2).",
        "Ajoute le mouvement circulaire des bras après le 3ᵉ lancer de chaque cycle.",
        "Travaille les deux sens de rotation."
     ]',
     9, 840, FALSE, '522'),

    (4, 'Revanche de Roméo (Romeo''s Revenge)',
     '52233',
     'La revanche de Roméo (Romeo''s Revenge) : figure expert de la famille Mills/Rubenstein avec siteswap 52233. Enchaînement de croisements rapides et de lancers hauts.',
     '[
        "Maîtrise la Revanche de Rubenstein avant la revanche de Roméo.",
        "Le siteswap 52233 demande un lancer 3 plus vertical pour laisser place au flourish.",
        "Décompose en cycles de 5 lancers avant d''enchaîner.",
        "Garde chaque balle sur son chemin — si un chemin change, ralentis."
     ]',
     10, 900, FALSE, '52233')

) AS v(level_id, trick_name, siteswap, description, learning_tips,
         difficulty_score, estimated_learning_duration, popular, juggling_lab_pattern)
WHERE NOT EXISTS (SELECT 1 FROM trick t WHERE t.trick_name = v.trick_name);


-- ── Prérequis (Library of Juggling) ──
INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT t.trick_id, p.trick_id
FROM trick t, trick p
WHERE (t.trick_name, p.trick_name) IN (
    ('Suivre (Follow)',                 'Cascade (3 balles)'),
    ('Transpalette (Forklift)',         'Cascade (3 balles)'),
    ('Sous le bras (Under the arm)',    'Cascade (3 balles)'),
    ('Chute pendule (Pendulum Drop)',   'Échange 2 balles'),
    ('Fausses colonnes (Fake Columns)', 'Colonnes (2 balles)'),
    ('Yo-Yo',                           'Fausses colonnes (Fake Columns)'),
    ('Cascade haut-bas (High-Low)',     'Cascade (3 balles)'),
    ('Niveaux (Levels)',                'Cascade (3 balles)'),
    ('Serpent (Snake)',                 'Cascade (3 balles)'),
    ('Chops',                           'Cascade inversée'),
    ('Boston Shuffle',                  'Cascade (3 balles)'),
    ('Cascade fontaine (Shower Cascade)','Demi-fontaine'),
    ('Cascade bras croisés (Crossed-Arm Cascade)', 'Cascade inversée'),
    ('Statue de la Liberté',            'Fontaine'),
    ('Trois en une (Three in One)',     'Fontaine'),
    ('Demi-Mess (Half-Mess)',           'Mills Mess'),
    ('Fontaine inversée (Inverted Shower)', 'Fontaine'),
    ('Mills Mess 441',                  'Mills Mess'),
    ('Mills Mess 441',                  'Cascade 441'),
    ('Mills Mess inversé (Reverse Mills Mess)', 'Mills Mess'),
    ('Boston Mess',                     'Mills Mess'),
    ('Boston Mess',                     'Boston Shuffle'),
    ('Barrage de Burke (Burke''s Barrage)', 'Mills Mess'),
    ('Usine (Factory)',                 'Cascade inversée'),
    ('423 (Le W)',                      'Cascade 441'),
    ('531',                             'Cascade 441'),
    ('Shuffle géorgien (Georgian Shuffle)', 'Mills Mess'),
    ('Takeouts',                        'Barrage de Burke (Burke''s Barrage)'),
    ('Glissade d''Al (Al''s Slide)',    'Cascade inversée'),
    ('Suspension de Harrison (Harrison''s Hang)', 'Mills Mess'),
    ('Revanche de Relf (Relf''s Revenge)', 'Mills Mess'),
    ('Revanche de Roméo (Romeo''s Revenge)', 'Revanche de Rubenstein')
)
ON CONFLICT DO NOTHING;
