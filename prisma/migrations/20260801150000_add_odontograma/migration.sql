-- 006-odontograma (data-model.md, research.md #1 a #10)

-- CreateEnum
CREATE TYPE "Denticion" AS ENUM ('ADULTO', 'NINO');

-- CreateEnum
CREATE TYPE "Superficie" AS ENUM ('MESIAL', 'DISTAL', 'VESTIBULAR', 'PALATINO_LINGUAL', 'OCLUSAL_INCISAL');

-- CreateEnum
CREATE TYPE "EstadoColorHallazgo" AS ENUM ('PENDIENTE', 'REALIZADO');

-- CreateEnum
CREATE TYPE "TipoCambioOdontograma" AS ENUM ('AGREGADO', 'EDITADO', 'ELIMINADO');

-- CreateTable
CREATE TABLE "Odontograma" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "denticion" "Denticion" NOT NULL,
    "hallazgos" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "conflictoPendiente" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Odontograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CambioOdontograma" (
    "id" TEXT NOT NULL,
    "odontogramaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "denticion" "Denticion" NOT NULL,
    "tipoCambio" "TipoCambioOdontograma" NOT NULL,
    "hallazgoId" TEXT NOT NULL,
    "dientes" TEXT[],
    "superficie" "Superficie",
    "descripcion" TEXT NOT NULL,
    "registradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CambioOdontograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPlanTratamiento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "diente" TEXT,
    "tratamiento" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "conflictoPendiente" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemPlanTratamiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Odontograma_pacienteId_denticion_key" ON "Odontograma"("pacienteId", "denticion");

-- CreateIndex
CREATE INDEX "CambioOdontograma_odontogramaId_registradoEn_idx" ON "CambioOdontograma"("odontogramaId", "registradoEn");

-- CreateIndex
CREATE INDEX "ItemPlanTratamiento_pacienteId_fecha_idx" ON "ItemPlanTratamiento"("pacienteId", "fecha");

-- AddForeignKey
ALTER TABLE "Odontograma" ADD CONSTRAINT "Odontograma_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioOdontograma" ADD CONSTRAINT "CambioOdontograma_odontogramaId_fkey" FOREIGN KEY ("odontogramaId") REFERENCES "Odontograma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPlanTratamiento" ADD CONSTRAINT "ItemPlanTratamiento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data migration (data-model.md §Modificación a `Cita`, Principio III): antes de eliminar
-- Cita.planTratamiento, cualquier valor no vacío de una Cita ya finalizada (o en curso) se
-- traslada a una fila nueva de ItemPlanTratamiento en vez de descartarse en silencio.
INSERT INTO "ItemPlanTratamiento" ("id", "pacienteId", "fecha", "diente", "tratamiento", "version", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "pacienteId",
    COALESCE("finalizadaEn", "createdAt")::date,
    NULL,
    "planTratamiento",
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Cita"
WHERE "planTratamiento" IS NOT NULL AND btrim("planTratamiento") <> '';

-- AlterTable (después de migrar los datos de arriba — FR-017, research.md #5)
ALTER TABLE "Cita" DROP COLUMN "planTratamiento";
