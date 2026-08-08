-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO', 'PREFIERO_NO_DECIR');

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "genero" "Genero";
