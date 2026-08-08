-- CreateTable
CREATE TABLE "ArchivoPaciente" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "tipo" "TipoArchivoEstudio" NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "contenido" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoPaciente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchivoPaciente_pacienteId_idx" ON "ArchivoPaciente"("pacienteId");

-- AddForeignKey
ALTER TABLE "ArchivoPaciente" ADD CONSTRAINT "ArchivoPaciente_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
