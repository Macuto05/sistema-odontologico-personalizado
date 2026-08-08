-- CreateEnum
CREATE TYPE "EstadoPaciente" AS ENUM ('ACTIVO', 'ARCHIVADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "documentoIdentidad" TEXT NOT NULL,
    "fechaNacimiento" DATE NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "estado" "EstadoPaciente" NOT NULL DEFAULT 'ACTIVO',
    "version" INTEGER NOT NULL DEFAULT 1,
    "conflictoPendiente" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperacionSincronizada" (
    "id" TEXT NOT NULL,
    "resultado" JSONB NOT NULL,
    "procesadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperacionSincronizada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_documentoIdentidad_key" ON "Paciente"("documentoIdentidad");

-- CreateIndex
CREATE INDEX "Paciente_estado_idx" ON "Paciente"("estado");
