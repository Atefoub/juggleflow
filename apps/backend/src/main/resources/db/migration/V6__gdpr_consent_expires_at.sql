-- =============================================================
-- JuggleFlow - Statut "expire" du consentement RGPD
-- Flyway migration V6
--
-- Permet de modeliser la duree de validite legale d'un
-- consentement parental (typiquement 1 an scolaire). Une fois
-- expire ou si la policy_version differe de la version courante,
-- le service le considere comme EXPIRED et le badge cote admin
-- bascule sur le canal orange "Expires" deja present cote UI.
--
-- expires_at NULL = consentement sans terme (anciens enregistrements
-- ou cas particulier autorise par le DPO).
-- =============================================================

ALTER TABLE gdpr_consent
    ADD COLUMN expires_at TIMESTAMPTZ;

CREATE INDEX idx_gdpr_consent_expires_at
    ON gdpr_consent (expires_at);

COMMENT ON COLUMN gdpr_consent.expires_at IS
    'Date d''expiration du consentement (NULL = sans terme). Compare a NOW() par GdprService.evaluateStatus.';
