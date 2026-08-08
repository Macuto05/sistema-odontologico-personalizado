-- AlterTable
ALTER TABLE "CambioOdontograma" ADD COLUMN     "notaId" TEXT,
ALTER COLUMN "hallazgoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Odontograma" ADD COLUMN     "notas" JSONB NOT NULL DEFAULT '[]';
