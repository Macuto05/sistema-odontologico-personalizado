-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "representanteCedula" TEXT,
ADD COLUMN     "representanteNombre" TEXT,
ALTER COLUMN "documentoIdentidad" DROP NOT NULL;
