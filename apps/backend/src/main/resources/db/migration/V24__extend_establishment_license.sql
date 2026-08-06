-- Prolongation de la date d'expiration licence seedée (V9 : 2026-06-30).
-- Nécessaire : au-delà de cette date, DemoBootstrap / création de comptes échouent en 403.

UPDATE establishment_settings
SET license_expires_at = '2027-12-31'
WHERE id = 1
  AND (license_expires_at IS NULL OR license_expires_at < DATE '2027-12-31');
