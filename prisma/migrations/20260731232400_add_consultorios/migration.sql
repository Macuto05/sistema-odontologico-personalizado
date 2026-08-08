-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "consultorioId" TEXT;

-- CreateTable
CREATE TABLE "Consultorio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consultorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consultorio_nombreNormalizado_key" ON "Consultorio"("nombreNormalizado");

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "Consultorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
