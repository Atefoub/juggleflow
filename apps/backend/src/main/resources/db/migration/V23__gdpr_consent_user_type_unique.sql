-- Un consentement par (utilisateur, type) : évite les doublons en course sur recordConsent().
DELETE FROM gdpr_consent older
USING gdpr_consent newer
WHERE older.user_id = newer.user_id
  AND older.consent_type = newer.consent_type
  AND older.consent_id < newer.consent_id;

ALTER TABLE gdpr_consent
  ADD CONSTRAINT uq_gdpr_consent_user_type UNIQUE (user_id, consent_type);
