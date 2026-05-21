-- =============================================================
-- V16 — Contenu pédagogique en français (Library of Juggling)
-- + patterns Juggling Lab pour animations fidèles (Mills Mess, etc.)
-- =============================================================

ALTER TABLE trick
    ADD COLUMN IF NOT EXISTS learning_tips JSONB,
    ADD COLUMN IF NOT EXISTS juggling_lab_pattern TEXT;

COMMENT ON COLUMN trick.learning_tips IS 'Conseils d''apprentissage (tableau JSON de chaînes).';
COMMENT ON COLUMN trick.juggling_lab_pattern IS 'Pattern Juggling Lab complet (siteswap + variables), prioritaire sur siteswap pour le GIF.';

-- ---------- Cascade (3 balls) ----------
UPDATE trick SET
    description = 'La cascade à 3 balles est la figure fondamentale du jonglage. Chaque balle suit une trajectoire en arc, alternant d''une main à l''autre. C''est la première figure à maîtriser avant toutes les autres variantes.',
    learning_tips = '[
        "Entraîne-toi d''abord à lancer et rattraper une balle d''une main à l''autre, un peu au-dessus de la tête.",
        "Utilise des balles molles (beanbags) : elles ne rebondissent pas et facilitent les rattrapages.",
        "Pour deux balles : lance la première, puis la seconde sous la première vers l''autre main — ne fais pas un passage horizontal.",
        "Pour trois balles : commence par le flash (tout lancer puis tout rattraper), puis enchaîne en rythme constant.",
        "Regarde le sommet des trajectoires, pas tes mains."
    ]'::jsonb,
    juggling_lab_pattern = NULL
WHERE trick_name = 'Cascade (3 balls)';

-- ---------- Shower ----------
UPDATE trick SET
    description = 'La fontaine (Shower) est très reconnaissable : des lancers hauts d''un côté et des passes rapides de l''autre. Une main lance toujours en arc, l''autre reçoit et repasse horizontalement.',
    learning_tips = '[
        "Maîtrise d''abord la demi-fontaine et des passes horizontales régulières.",
        "Étape 1 : une main fait un grand lancer, l''autre passe tout de suite la balle vers la main qui vient de lancer.",
        "Étape 2 : même exercice, mais attends que le premier lancer arrive vers l''autre main avant de passer.",
        "Étape 3 : enchaîne lancer haut → passe → rattrape avec l''autre main.",
        "Avec 3 balles : deux lancers hauts d''affilée depuis la main dominante, puis une passe au bon moment.",
        "Entraîne aussi la fontaine en sens inverse pour équilibrer tes deux mains."
    ]'::jsonb,
    juggling_lab_pattern = NULL
WHERE trick_name = 'Shower';

-- ---------- Half-Shower ----------
UPDATE trick SET
    description = 'La demi-fontaine est asymétrique : une main envoie la balle en arc vers l''autre (comme en fontaine), tandis que l''autre main lance sa balle en colonne verticale rattrapée par la même main.',
    learning_tips = '[
        "Travaille chaque type de lancer séparément avant de les combiner.",
        "La main « fontaine » envoie un arc vers l''extérieur ; la main « colonne » lance tout droit au-dessus de la même main.",
        "Garde un rythme régulier : le lancer en arc et le lancer vertical ne doivent pas se marcher dessus.",
        "Une fois stable, tu pourras viser la fontaine complète (51)."
    ]'::jsonb,
    juggling_lab_pattern = NULL
WHERE trick_name = 'Half-Shower';

-- ---------- Mills Mess ----------
UPDATE trick SET
    description = 'Créée par Steven Mills, le Mills Mess est une variation spectaculaire de la cascade : les bras se croisent et se décroisent en rythme, avec un flux latéral continu. Le siteswap reste « 3 », mais le croisement des bras change complètement l''aspect visuel.',
    learning_tips = '[
        "Décompose en trois lancers : chaque balle a un chemin précis — ne mélange pas les trajectoires.",
        "Balle 1 : bras croisés, lance vers l''autre main en décroisant puis recroisant les bras.",
        "Balle 2 : part de l''autre main au moment où les bras sont au même niveau (décroisement).",
        "Balle 3 : lancée en dernier depuis la main dominante ; rattrapée par la main qui lance la balle 1 du cycle suivant.",
        "Enchaîne un cycle complet avant d''enchaîner plusieurs ; garde le flux de gauche à droite.",
        "Évite de retomber sur des colonnes verticales : le mouvement doit rester latéral.",
        "Entraîne-toi à commencer avec la main dominante ou non dominante en tête."
    ]'::jsonb,
    juggling_lab_pattern = '3;hands=(-25)(2.5).(25)(-2.5).(-25)(0).'
WHERE trick_name = 'Mills Mess';

-- ---------- Cascade 441 ----------
UPDATE trick SET
    description = 'La cascade 441 est une variation à 3 balles : deux lancers plus hauts suivis d''un lancer standard, ce qui crée un court moment de suspension dans le motif.',
    learning_tips = '[
        "Assure-toi d''avoir une cascade stable avant d''ajouter la hauteur des lancers « 4 ».",
        "Compte mentalement 4 – 4 – 1 : deux temps hauts puis le lancer habituel de cascade.",
        "Garde le rythme régulier : les lancers hauts ne doivent pas désynchroniser la main opposée.",
        "Travaille lentement, puis accélère quand les hauteurs sont constantes."
    ]'::jsonb,
    juggling_lab_pattern = NULL
WHERE trick_name = 'Cascade 441';

-- ---------- Box ----------
UPDATE trick SET
    description = 'La box (boîte) combine des lancers verticaux synchrones et une passe horizontale : deux balles montent en colonnes pendant que la troisième traverse entre les mains. Motif exigeant mais très visuel.',
    learning_tips = '[
        "Maîtrise la demi-fontaine et la fontaine avant la box.",
        "Exercice à 2 balles : un lancer vertical + une passe horizontale au même instant, puis inverse.",
        "La box est simple en théorie mais demande une précision de timing — prévois plusieurs séances.",
        "Avec 3 balles : deux dans une main, lancer vertical, puis lancer vertical de l''autre main + passe au bon moment.",
        "Garde les colonnes bien verticales ; évite d''incliner les lancers latéraux."
    ]'::jsonb,
    juggling_lab_pattern = NULL
WHERE trick_name = 'Box';

-- ---------- Rubenstein's Revenge ----------
UPDATE trick SET
    siteswap = '52233',
    description = 'La revanche de Rubenstein (Rick Rubenstein) ressemble au Mills Mess avec un mouvement circulaire des bras après le troisième lancer de chaque cycle. Le siteswap 52233 permet un lancer plus haut pour laisser place au « flourish ».',
    learning_tips = '[
        "Maîtrise le Mills Mess avant d''aborder cette figure.",
        "Isole d''abord le flourish à deux balles : bras croisés, cercle des balles, lancers croisés type Mills, claw catch.",
        "La troisième balle est lancée plus verticalement pour ne pas gêner le mouvement des bras.",
        "Chaque balle doit garder le même chemin à chaque cycle ; si un chemin change, reviens plus lentement.",
        "Travaille les deux sens de croisement des bras."
    ]'::jsonb,
    juggling_lab_pattern = '52233'
WHERE trick_name = 'Rubenstein''s Revenge';

-- ---------- Reverse cascade (V10) ----------
UPDATE trick SET
    description = 'La cascade inversée (reverse cascade) est identique à la cascade classique, mais tous les lancers partent vers l''extérieur (overthrows). C''est l''une des figures clés pour le Mills Mess et les motifs croisés.',
    learning_tips = '[
        "Maîtrise la demi-fontaine et des overthrows propres avant d''enchaîner.",
        "Depuis une cascade : fais deux overthrows d''affilée (gauche puis droite), puis reviens en cascade.",
        "Ajoute un overthrow de plus à chaque série jusqu''à enchaîner en continu.",
        "Figure plus difficile que la demi-fontaine : prévois du temps de pratique régulier."
    ]'::jsonb,
    juggling_lab_pattern = '3;hands=(25)(-2.5).(-25)(2.5).(25)(0).'
WHERE trick_name = 'Reverse cascade';

-- ---------- Columns (2 balls) ----------
UPDATE trick SET
    description = 'Les colonnes à 2 balles : deux balles montent en trajectoires verticales parallèles dans une même main. Bon exercice pour préparer les colonnes à 3 balles et le travail en « two in one ».',
    learning_tips = '[
        "Commence avec une seule balle en colonne verticale dans une main.",
        "Ajoute la deuxième balle : lance la première, quand elle redescend lance la seconde sur la même trajectoire.",
        "Garde les lancers au centre du corps, sans dérive latérale.",
        "Une fois stable, passe au « two in one hand » à 3 balles."
    ]'::jsonb,
    juggling_lab_pattern = NULL
WHERE trick_name = 'Columns (2 balls)';

-- ---------- Two in one hand ----------
UPDATE trick SET
    siteswap = '60',
    description = 'Le « two in one » à 3 balles : toutes les balles sont lancées et rattrapées par la même main, en circuit vertical vers l''extérieur du corps (comme une moitié de fountain à 6 balles).',
    learning_tips = '[
        "À 2 balles dans la main dominante : deux lancers verticaux rapides vers l''extérieur, puis rattrapages.",
        "Quand c''est fluide, ajoute la 3ᵉ balle : lance-la quand la première revient vers ta main.",
        "Travaille les deux mains séparément avant de combiner avec d''autres figures.",
        "Prérequis utile pour les colonnes synchrones à 3 balles."
    ]'::jsonb,
    juggling_lab_pattern = '60'
WHERE trick_name = 'Two in one hand';

-- ---------- Scarf cascade ----------
UPDATE trick SET
    description = 'La cascade aux foulards est idéale pour débuter : les foulards tombent lentement, ce qui laisse le temps de voir et de corriger. Même principe que la cascade à balles, avec un rythme plus lent.',
    learning_tips = '[
        "Tiens chaque foulard par un coin pour un lancer propre.",
        "Lance vers l''autre main en arc large, à hauteur du visage.",
        "Ne précipite pas le troisième lancer : le rythme foulard est plus lent que celui des balles.",
        "Une fois stable, passe aux balles en gardant le même schéma de lancers."
    ]'::jsonb,
    juggling_lab_pattern = '3'
WHERE trick_name = 'Scarf cascade';

-- ---------- Prérequis (alignés sur Library of Juggling) ----------
DELETE FROM prerequisite p
USING trick t
WHERE p.trick_id = t.trick_id
  AND t.trick_name IN (
      'Mills Mess', 'Shower', 'Reverse cascade', 'Box', 'Columns (2 balls)', 'Two in one hand'
  );

INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT m.trick_id, r.trick_id
FROM trick m, trick r
WHERE m.trick_name = 'Mills Mess' AND r.trick_name = 'Reverse cascade'
ON CONFLICT DO NOTHING;

INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT s.trick_id, p.trick_id
FROM trick s, trick p
WHERE s.trick_name = 'Shower'
  AND p.trick_name IN ('Half-Shower', 'Cascade 441')
ON CONFLICT DO NOTHING;

INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT r.trick_id, p.trick_id
FROM trick r, trick p
WHERE r.trick_name = 'Reverse cascade'
  AND p.trick_name IN ('Half-Shower', 'Cascade (3 balls)')
ON CONFLICT DO NOTHING;

INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT b.trick_id, p.trick_id
FROM trick b, trick p
WHERE b.trick_name = 'Box'
  AND p.trick_name IN ('Shower', 'Cascade 441')
ON CONFLICT DO NOTHING;

INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT c.trick_id, t.trick_id
FROM trick c, trick t
WHERE c.trick_name = 'Columns (2 balls)' AND t.trick_name = 'Two in one hand'
ON CONFLICT DO NOTHING;

INSERT INTO prerequisite (trick_id, prerequisite_trick_id)
SELECT t.trick_id, c.trick_id
FROM trick t, trick c
WHERE t.trick_name = 'Two in one hand' AND c.trick_name = 'Cascade (3 balls)'
ON CONFLICT DO NOTHING;

-- ---------- Noms affichés en français ----------
UPDATE trick SET trick_name = 'Cascade (3 balles)' WHERE trick_name = 'Cascade (3 balls)';
UPDATE trick SET trick_name = 'Fontaine' WHERE trick_name = 'Shower';
UPDATE trick SET trick_name = 'Demi-fontaine' WHERE trick_name = 'Half-Shower';
UPDATE trick SET trick_name = 'Cascade inversée' WHERE trick_name = 'Reverse cascade';
UPDATE trick SET trick_name = 'Colonnes (2 balles)' WHERE trick_name = 'Columns (2 balls)';
UPDATE trick SET trick_name = 'Deux en une main' WHERE trick_name = 'Two in one hand';
UPDATE trick SET trick_name = 'Cascade aux foulards' WHERE trick_name = 'Scarf cascade';
UPDATE trick SET trick_name = 'Revanche de Rubenstein' WHERE trick_name = 'Rubenstein''s Revenge';

-- Défis quotidiens (libellés figures)
UPDATE daily_challenge
SET title = 'Fontaine x 10',
    description = 'Réussis 10 lancers consécutifs de la Fontaine.'
WHERE rotation_slot = 1;
