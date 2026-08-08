# Implementation Plan: Migrar almacenamiento de archivos a Supabase Storage

**Branch**: `012-archivos-supabase-storage` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-archivos-supabase-storage/spec.md`

## Summary

`ArchivoPaciente` y `ArchivoEstudio` guardan hoy su contenido binario en una columna `Bytes`
de Postgres. Este plan lo mueve a Supabase Storage sin tocar el contrato de API ni el dominio:
el cambio queda contenido enteramente en la capa de infraestructura (`ArchivoPacienteRepositoryPrisma`
y `ArchivoEstudioRepositoryPrisma`), que pasa de leer/escribir la columna `contenido` a
subir/bajar/borrar un objeto en un bucket privado, usando el `id` del registro como clave del
objeto (sin columna nueva). Las interfaces de dominio (`IArchivoPacienteRepository`,
`IArchivoEstudioRepository`) y las rutas de API no cambian de forma.

## Technical Context

**Language/Version**: TypeScript, Next.js 15 (App Router)

**Primary Dependencies**: Prisma ORM (Postgres en Supabase), `@supabase/supabase-js` (ya
instalado, cliente server-side en `src/infrastructure/storage/supabase/client.ts`), Auth.js

**Storage**: PostgreSQL (metadata, sin cambios) + Supabase Storage (contenido binario, nuevo)

**Testing**: Vitest (unit/integration), Playwright (e2e) — igual que el resto del proyecto

**Target Platform**: Next.js server (API routes), navegador (fetch de la UI existente)

**Project Type**: Web application (single Next.js codebase, capas domain/application/infrastructure/UI)

**Performance Goals**: Sin cambio respecto al comportamiento actual — una operación de
Storage por subida/descarga/borrado, mismo orden de magnitud que la operación Prisma que
reemplaza (Principio VIII: no introducir llamadas redundantes).

**Constraints**: Acceso a Storage exclusivamente server-side (service-role key nunca en el
cliente); mismo contrato de API (`FR-003`); sin backfill de datos existentes (ver spec,
Assumptions); límite de 20 MB por archivo (spec, Assumptions).

**Scale/Scope**: Un solo consultorio/odontólogo, volumen bajo (no miles de archivos/día) —
mismo orden de magnitud ya asumido en `specs/005-atencion-paciente/research.md` #4.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Test-First | Aplica igual que a cualquier feature: tests de los repositorios (mockeando el cliente de Supabase Storage) y de las rutas afectadas deben escribirse y fallar antes de tocar la implementación. Se detalla en Phase 1 / tasks. |
| II. Layered Architecture | El cambio queda contenido en `src/infrastructure/**` (repositorios Prisma + nuevo cliente Storage). `IArchivoPacienteRepository`/`IArchivoEstudioRepository` (dominio) y los casos de uso no cambian — nunca importan `@supabase/supabase-js`. PASA. |
| III. Data Integrity & Auditability | La migración de schema (`DROP COLUMN contenido`) no es reversible una vez aplicada (se pierde el binario si había datos). Ver research.md #5 para el plan de rollback documentado — aceptable porque el entorno hoy no tiene datos reales de pacientes (spec, Assumptions), pero el plan de rollback queda escrito por si esto se aplica más adelante con datos reales. |
| IV. RBAC | Sin cambios: sigue siendo la única cuenta (odontólogo), mismos checks de sesión en cada ruta. PASA. |
| V. Simplicity & YAGNI | Un solo bucket privado con dos prefijos (`pacientes/`, `estudios/`), clave de objeto derivada del `id` existente — sin columna nueva, sin URLs firmadas, sin capa de abstracción sobre "proveedores de storage" (no hay un segundo proveedor que lo justifique). PASA. |
| VI. UI Consistency & Responsive Design | N/A — no hay cambios de UI; la pestaña de Archivos y el visor de estudios se ven y comportan igual. |
| VII. Security & Vulnerability Prevention | Bucket privado (no público); acceso solo vía service-role key en `src/infrastructure/storage/supabase/client.ts` (server-only); se preservan los checks de pertenencia de registro (paciente/cita/estudio) ya existentes antes de tocar Storage. PASA — se verifica explícitamente en quickstart.md. |
| VIII. Performance & Efficient Data Access | Una llamada a Storage por subida/descarga/borrado, mismo orden que la operación Prisma que reemplaza. Sin N+1 nuevo. PASA. |

No hay violaciones que requieran `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/012-archivos-supabase-storage/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output (nota: sin cambios de contrato, documentado igual)
└── tasks.md               # Phase 2 output (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/ArchivoPaciente.ts, ArchivoEstudio.ts      # sin cambios
│   ├── repositories/IArchivoPacienteRepository.ts,
│   │                 IArchivoEstudioRepository.ts           # sin cambios
│   └── errors.ts                                            # + ArchivoDemasiadoGrandeError
├── application/use-cases/
│   ├── agregarArchivoPaciente.ts, agregarArchivoEstudio.ts   # sin cambios de firma
├── infrastructure/
│   ├── db/prisma/
│   │   ├── ArchivoPacienteRepositoryPrisma.ts                # MODIFICADO: sube/baja/borra vía Storage
│   │   └── ArchivoEstudioRepositoryPrisma.ts                 # MODIFICADO: ídem
│   └── storage/supabase/
│       ├── client.ts                                         # ya existe
│       └── archivosStorage.ts                                # NUEVO: subir/leer/borrar objeto, construir clave
└── app/api/
    ├── patients/[id]/archivos/**                              # sin cambios de contrato
    └── citas/[id]/estudios/[estudioItemId]/archivos/**         # sin cambios de contrato

prisma/
├── schema.prisma                                              # MODIFICADO: DROP contenido de ambos modelos
└── migrations/NNNNNNNNNNNNNN_archivos_a_supabase_storage/      # NUEVO
```

**Structure Decision**: Se reutiliza la estructura de capas ya establecida (domain →
application → infrastructure → app/api). No se agrega ningún directorio nuevo de alto nivel;
solo un archivo nuevo (`archivosStorage.ts`) dentro de la carpeta de infraestructura ya creada
para Supabase.
