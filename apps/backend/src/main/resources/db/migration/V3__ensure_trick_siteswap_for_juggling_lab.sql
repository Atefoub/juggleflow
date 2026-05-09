-- =============================================================
-- Garantit des siteswaps exploitables par le serveur GIF Juggling Lab
-- (https://jugglinglab.org/anim — notation généralisée).
--
-- Idempotent : ne remplit que si siteswap est NULL ou vide.
-- Les bases déjà seedées par V2 restent inchangées sauf réparation.
-- =============================================================

UPDATE trick SET siteswap = '3'
WHERE trick_name = 'Cascade (3 balls)'
  AND (siteswap IS NULL OR btrim(siteswap) = '');

UPDATE trick SET siteswap = '51'
WHERE trick_name = 'Shower'
  AND (siteswap IS NULL OR btrim(siteswap) = '');

UPDATE trick SET siteswap = '42'
WHERE trick_name = 'Half-Shower'
  AND (siteswap IS NULL OR btrim(siteswap) = '');

UPDATE trick SET siteswap = '3'
WHERE trick_name = 'Mills Mess'
  AND (siteswap IS NULL OR btrim(siteswap) = '');

UPDATE trick SET siteswap = '441'
WHERE trick_name = 'Cascade 441'
  AND (siteswap IS NULL OR btrim(siteswap) = '');

UPDATE trick SET siteswap = '(4,2x)(2x,4)'
WHERE trick_name = 'Box'
  AND (siteswap IS NULL OR btrim(siteswap) = '');

-- Rubenstein's Revenge : pas de siteswap unique standard pour Juggling Lab ;
-- juggling_lab_animation_url peut être renseigné manuellement si besoin.
