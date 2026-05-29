-- Préférence thème sombre (profil élève, sync multi-appareils)

ALTER TABLE student
    ADD COLUMN dark_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN student.dark_mode_enabled IS
    'Thème sombre activé (false = thème clair). Préférence élève, profil.';
