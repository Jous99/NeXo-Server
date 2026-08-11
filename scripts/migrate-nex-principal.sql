-- NeXoNetwork — Migración: nex_principal_id en users
--
-- El emulador (NeXo-emu) usa como principal de NEX el hash u64 del UUID de su
-- perfil LOCAL de usuario (ver acc.cpp: account_id.Hash()). Ese número (p.ej.
-- 5821821772049353572) NO es users.id ni el nexo_id — es propio del emulador.
--
-- El ticket-granting (nex-server/) recibe ese principal como "username". Para
-- resolverlo a una cuenta real, guardamos el principal de cada usuario en esta
-- columna. El store Go (internal/accounts/store.go) busca por aquí y usa este
-- valor como PID de NEX (así el ticket y la conexión "secure" son coherentes).
--
-- Cómo obtener el principal de un usuario: al entrar al online, mk8-auth loguea
--   [auth] LoginEx/WithCustomData (MK8D) recibido: username="<PRINCIPAL>"
-- Copia ese número y guárdalo con el UPDATE de abajo.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nex_principal_id BIGINT UNSIGNED DEFAULT NULL AFTER nex_password;

-- Índice único para poder buscar rápido por principal (y evitar duplicados).
-- (Si tu MariaDB no soporta "IF NOT EXISTS" en CREATE INDEX, ignora el error si
--  el índice ya existe.)
CREATE UNIQUE INDEX idx_users_nex_principal ON users (nex_principal_id);
