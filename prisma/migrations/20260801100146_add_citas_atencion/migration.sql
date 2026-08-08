-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('EN_CURSO', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "CategoriaConsulta" AS ENUM ('CONTROL', 'URGENCIA', 'LIMPIEZA_PROFILAXIS', 'ENDODONCIA', 'EXTRACCION', 'RESTAURACION_OBTURACION', 'ORTODONCIA', 'CIRUGIA', 'CONSULTA_GENERAL', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoArchivoEstudio" AS ENUM ('IMAGEN', 'PDF');

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'EN_CURSO',
    "categoria" "CategoriaConsulta",
    "motivoConsulta" TEXT,
    "diagnostico" TEXT,
    "planTratamiento" TEXT,
    "recetaItems" JSONB NOT NULL DEFAULT '[]',
    "estudioItems" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "conflictoPendiente" JSONB,
    "finalizadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivoEstudio" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "estudioItemId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "tipo" "TipoArchivoEstudio" NOT NULL,
    "contenido" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoEstudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cita_pacienteId_estado_idx" ON "Cita"("pacienteId", "estado");

-- CreateIndex
CREATE INDEX "ArchivoEstudio_citaId_estudioItemId_idx" ON "ArchivoEstudio"("citaId", "estudioItemId");

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoEstudio" ADD CONSTRAINT "ArchivoEstudio_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
