-- NeXoNetwork — Migración: nex_password en users
-- Para instalaciones EXISTENTES (schema.sql ya aplicado antes de estos cambios).
-- Instalaciones nuevas no necesitan este script: schema.sql ya incluye la columna.
--
-- El PID de NEX (nex-server/) es directamente `id` — no hace falta ninguna
-- columna ni migración para eso.
--
-- Ejecuta: mysql -u root -p nexo_network < scripts/migrate-nex-password.sql

USE nexo_network;

ALTER TABLE users ADD COLUMN IF NOT EXISTS nex_password VARCHAR(64) DEFAULT NULL AFTER is_admin;

-- nex_password para cuentas existentes: NO se puede generar aquí (necesita
-- crypto.randomBytes de Node, no un equivalente seguro trivial en SQL puro).
-- Ejecuta después: node scripts/backfill-nex-password.js
