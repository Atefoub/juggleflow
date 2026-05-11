-- =============================================================
-- JuggleFlow - Streak / pratique / defi du jour
-- Flyway migration V5
--
-- Trois tables pour brancher des metiers laisses en mock cote frontend :
--   1. user_streak       : suivi des jours consecutifs reels (badge "Perseverant")
--   2. practice_session  : temps de pratique horodate (badge "Marathon")
--   3. daily_challenge   : defi du jour seede et rotation deterministe
--
-- Les seeds (V2) referencaient deja des badges `practice_time` et
-- `consecutive_days` mais BadgeService n'evaluait que `tricks_mastered` ;
-- ces tables fournissent la matiere premiere reelle pour ces criteres.
-- =============================================================


-- =============================================================
--  TABLE : user_streak
--  Une ligne par utilisateur. last_practice_date est en DATE (pas
--  TIMESTAMPTZ) : on raisonne "jour calendaire" pour le streak.
-- =============================================================

CREATE TABLE user_streak (
    user_id              BIGINT       PRIMARY KEY
                                       REFERENCES users (id) ON DELETE CASCADE,
    current_streak_days  INT          NOT NULL DEFAULT 0
                                       CHECK (current_streak_days >= 0),
    longest_streak_days  INT          NOT NULL DEFAULT 0
                                       CHECK (longest_streak_days >= 0),
    last_practice_date   DATE,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_longest_ge_current
        CHECK (longest_streak_days >= current_streak_days)
);

CREATE INDEX idx_user_streak_last_practice
    ON user_streak (last_practice_date);

CREATE TRIGGER trg_user_streak_updated_at
    BEFORE UPDATE ON user_streak
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE user_streak IS
    'Compteur de jours consecutifs par utilisateur (badge Perseverant et stats dashboard).';


-- =============================================================
--  TABLE : practice_session
--  Une session = un intervalle de pratique chronometre.
--  duration_seconds est stocke explicitement (et indexable) plutot
--  que recalcule a chaque agregation.
-- =============================================================

CREATE TABLE practice_session (
    id                BIGSERIAL    PRIMARY KEY,
    user_id           BIGINT       NOT NULL
                                    REFERENCES users (id) ON DELETE CASCADE,
    trick_id          BIGINT       REFERENCES trick (trick_id) ON DELETE SET NULL,
    started_at        TIMESTAMPTZ  NOT NULL,
    ended_at          TIMESTAMPTZ,
    duration_seconds  INT          NOT NULL CHECK (duration_seconds > 0),
    source            VARCHAR(50)  NOT NULL DEFAULT 'student_session',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_session_end_after_start
        CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_practice_session_user_started
    ON practice_session (user_id, started_at DESC);

CREATE INDEX idx_practice_session_user_duration
    ON practice_session (user_id, duration_seconds);

COMMENT ON TABLE practice_session IS
    'Sessions de pratique horodatees pour calculer le temps total (badge Marathon) et alimenter les stats.';


-- =============================================================
--  TABLE : daily_challenge
--  On stocke N defis numerotes par rotation_slot ; le service
--  selectionne celui dont le slot correspond a `today.epochDay() % N`.
--  Plus simple qu'une planification par date fixe et trivialement
--  testable.
-- =============================================================

CREATE TABLE daily_challenge (
    id               BIGSERIAL     PRIMARY KEY,
    rotation_slot    INT           NOT NULL UNIQUE
                                    CHECK (rotation_slot >= 0),
    title            VARCHAR(200)  NOT NULL,
    description      TEXT          NOT NULL,
    target_trick_id  BIGINT        REFERENCES trick (trick_id) ON DELETE SET NULL,
    target_value     INT           CHECK (target_value IS NULL OR target_value > 0),
    target_unit      VARCHAR(50),
    active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_challenge_active_slot
    ON daily_challenge (active, rotation_slot);

COMMENT ON TABLE daily_challenge IS
    'Catalogue de defis quotidiens. Selection deterministe par rotation : slot = epochDay mod count(active).';


-- =============================================================
--  Seed : 7 defis cycliques (un par jour de la semaine)
--  Refs trick : Cascade=1, Shower=2, Half-Shower=3, Mills Mess=4,
--  Cascade 441=5, Box=6, Rubenstein's Revenge=7 (cf. V2).
-- =============================================================

INSERT INTO daily_challenge
    (rotation_slot, title, description, target_trick_id, target_value, target_unit) VALUES
    (0, 'Cascade x 20',           'Enchaine 20 lancers de Cascade sans casser le rythme.',                    1, 20, 'reps'),
    (1, 'Shower a 10',            'Reussis 10 lancers consecutifs de la Shower.',                              2, 10, 'reps'),
    (2, 'Echauffement 5 minutes', 'Cinq minutes d''echauffement poignets et lancers a une balle.',           NULL,  5, 'minutes'),
    (3, 'Mills Mess - essai',     'Tente le pattern Mills Mess : 3 cycles complets sans interruption.',        4,  3, 'reps'),
    (4, 'Cascade 441',            'Travaille la Cascade 441 sur 15 lancers.',                                  5, 15, 'reps'),
    (5, 'Concentration',          'Une session de 3 minutes en Cascade sans regarder tes mains.',              1,  3, 'minutes'),
    (6, 'Defi libre',              'Choisis ta figure preferee et tente une serie record. Repos bien merite.', NULL, NULL, NULL);
