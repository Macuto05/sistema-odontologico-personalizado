# Data Model: Migrar almacenamiento de archivos a Supabase Storage

Sin cambios en las entidades de dominio (`src/domain/entities/ArchivoPaciente.ts`,
`ArchivoEstudio.ts`) ni en los puertos (`IArchivoPacienteRepository`,
`IArchivoEstudioRepository`) — `contenido: Uint8Array` sigue siendo el shape que ven el caso
de uso y la ruta API; lo que cambia es de dónde lo lee/escribe la implementación Prisma.

## Cambios en `prisma/schema.prisma`

### `ArchivoPaciente`

```prisma
model ArchivoPaciente {
  id            String             @id @default(uuid())
  pacienteId    String
  paciente      Paciente           @relation(fields: [pacienteId], references: [id], onDelete: Cascade)
  nombreArchivo String
  tipo          TipoArchivoEstudio
  tamanoBytes   Int
- contenido     Bytes
  createdAt     DateTime           @default(now())

  @@index([pacienteId])
}
```

`tamanoBytes` se mantiene: sigue calculándose en el momento de subir (`contenido.length`), ya
no requiere la columna `contenido` para existir — es un valor independiente, no derivado de
ella en tiempo de lectura.

### `ArchivoEstudio`

```prisma
model ArchivoEstudio {
  id            String             @id @default(uuid())
  citaId        String
  cita          Cita               @relation(fields: [citaId], references: [id], onDelete: Cascade)
  estudioItemId String
  nombreArchivo String
  tipo          TipoArchivoEstudio
- contenido     Bytes
  createdAt     DateTime           @default(now())

  @@index([citaId, estudioItemId])
}
```

Sin columna `tamanoBytes` — no existía antes de esta migración y ningún requisito la necesita
(`ArchivoEstudioMeta` nunca expuso tamaño, ver `src/domain/entities/Cita.ts`); no se agrega
especulativamente (Principio V).

### Migración

Una sola migración Prisma (`prisma migrate dev --name archivos_a_supabase_storage`) que hace
`ALTER TABLE ... DROP COLUMN "contenido"` en ambas tablas. Ver research.md #5 para el gate de
confirmación antes de aplicarla fuera de local.

## Nuevo: convención de clave de objeto en Supabase Storage

No es una entidad de base de datos — vive como una función pura en
`src/infrastructure/storage/supabase/archivosStorage.ts`:

```ts
claveArchivoPaciente(pacienteId: string, archivoId: string): string
  → `pacientes/${pacienteId}/${archivoId}`

claveArchivoEstudio(citaId: string, estudioItemId: string, archivoId: string): string
  → `estudios/${citaId}/${estudioItemId}/${archivoId}`
```

Bucket: `archivos-clinicos` (privado). Ver research.md #1/#2.

## Nuevo error de dominio

`src/domain/errors.ts` gana `ArchivoDemasiadoGrandeError`, mismo patrón que las clases de
error existentes (`extends Error`, `name` propio), usada cuando el archivo recibido supera el
límite de tamaño (spec FR-010, 20 MB — ver research.md #4).
