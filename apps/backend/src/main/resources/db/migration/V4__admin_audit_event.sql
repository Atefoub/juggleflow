-- Journal d'audit administration (actions sensibles)
CREATE TABLE admin_audit_event (
    id           BIGSERIAL       PRIMARY KEY,
    occurred_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actor_email  VARCHAR(255)  NOT NULL,
    action       VARCHAR(100)  NOT NULL,
    details      TEXT
);

CREATE INDEX idx_admin_audit_occurred ON admin_audit_event (occurred_at DESC);

COMMENT ON TABLE admin_audit_event IS
    'Trace des actions admin (RGPD, comptes, classes) pour consultation par les administrateurs.';
