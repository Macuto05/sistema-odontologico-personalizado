-- 012-archivos-supabase-storage: el contenido binario pasa a vivir en Supabase Storage.
-- Gate de research.md #5 verificado antes de aplicar: ambas tablas estaban vacías.
-- Rollback manual: restaurar la columna desde el backup automático de Supabase anterior
-- a esta migración (un DROP COLUMN no es reversible una vez purgado).
ALTER TABLE "ArchivoPaciente" DROP COLUMN "contenido";
ALTER TABLE "ArchivoEstudio" DROP COLUMN "contenido";
