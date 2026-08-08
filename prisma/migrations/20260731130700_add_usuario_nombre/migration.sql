-- Agrega la columna `nombre` a `Usuario` (002-pantalla-inicio, data-model.md).
-- Se agrega nullable, se rellena con un valor derivado del email para las cuentas ya
-- sembradas, y recién entonces se marca NOT NULL — evita romper filas existentes.
-- El odontólogo debe corregir este valor placeholder desde Configuración (FR-011).
ALTER TABLE "Usuario" ADD COLUMN "nombre" TEXT;

UPDATE "Usuario" SET "nombre" = split_part(email, '@', 1) WHERE "nombre" IS NULL;

ALTER TABLE "Usuario" ALTER COLUMN "nombre" SET NOT NULL;
