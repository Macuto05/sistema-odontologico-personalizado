-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_LIBRE');

-- AlterEnum
BEGIN;
CREATE TYPE "Genero_new" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');
ALTER TABLE "Paciente" ALTER COLUMN "genero" TYPE "Genero_new" USING ("genero"::text::"Genero_new");
ALTER TYPE "Genero" RENAME TO "Genero_old";
ALTER TYPE "Genero_new" RENAME TO "Genero";
DROP TYPE "public"."Genero_old";
COMMIT;

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "estadoCivil" "EstadoCivil",
ADD COLUMN     "ocupacion" TEXT;
