# Tasks: Migrar almacenamiento de archivos a Supabase Storage

**Input**: Design documents from `specs/012-archivos-supabase-storage/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: incluidos — Principio I (Test-First) de la constitución es NON-NEGOTIABLE en este
proyecto, no opcional.

**Organización**: tareas agrupadas por historia de usuario (spec.md) para poder implementar y
validar cada una de forma independiente.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: puede hacerse en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3)

---

## Phase 1: Setup

- [X] T001 Crear el bucket **privado** `archivos-clinicos` en el dashboard de Supabase
  (Storage → New bucket, "Public bucket" = OFF) — gate manual de research.md #1/quickstart.md,
  bloquea todo lo demás.
- [X] T002 [P] Crear `src/domain/constants.ts` con
  `export const TAMANO_MAXIMO_ARCHIVO_BYTES = 20 * 1024 * 1024;` (spec FR-010, research.md #4).
- [X] T003 [P] Agregar `ArchivoDemasiadoGrandeError` en `src/domain/errors.ts`, mismo patrón
  que las clases de error existentes (`extends Error`, `name` propio) — ver
  `TipoArchivoNoSoportadoError` como referencia directa.

---

## Phase 2: Foundational (bloqueante para ambas historias)

**⚠️ CRÍTICO**: nada de Phase 3+ puede empezar hasta terminar esta fase.

- [X] T004 Crear `src/infrastructure/storage/supabase/archivosStorage.ts` con:
  `claveArchivoPaciente(pacienteId, archivoId)` → `pacientes/${pacienteId}/${archivoId}`,
  `claveArchivoEstudio(citaId, estudioItemId, archivoId)` → `estudios/${citaId}/${estudioItemId}/${archivoId}`,
  `subirArchivo(clave, contenido, contentType)`, `leerArchivo(clave)`, `borrarArchivo(clave)` —
  usa `supabaseStorage` de `src/infrastructure/storage/supabase/client.ts` contra el bucket
  `archivos-clinicos`. Sin lógica de dominio acá, solo wrappers finos (research.md #1/#2).
- [X] T005 [P] Test unitario de `archivosStorage.ts` en
  `tests/unit/archivosStorage.test.ts` — mockear `@/infrastructure/storage/supabase/client`
  y verificar que cada función arma la clave correcta y llama al método correspondiente del
  SDK (`upload`, `download`, `remove`). Escribir antes de dar T004 por terminado, debe fallar
  primero.
- [X] T006 Modificar `prisma/schema.prisma`: quitar la columna `contenido` de `ArchivoPaciente`
  y de `ArchivoEstudio` (data-model.md). Correr `npx prisma migrate dev --name archivos_a_supabase_storage`
  en local primero.
- [X] T007 Aplicar la migración de T006 contra Supabase — seguir el gate de confirmación de
  research.md #5 (verificar que ambas tablas están vacías o migradas antes de aplicar; si tu
  red bloquea el puerto directo de Postgres, generar el SQL y pegarlo en el SQL Editor de
  Supabase, mismo procedimiento ya usado para el esquema inicial).

**Checkpoint**: con T001–T007 listos, ambas historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 — Subir un archivo (Priority: P1) 🎯 MVP

**Goal**: subir un PDF o imagen (paciente o estudio) queda guardado en Supabase Storage, con
el mismo comportamiento visible que hoy.

**Independent Test**: subir un PDF y una imagen desde la ficha de un paciente de prueba,
confirmar que aparecen en la lista con nombre/tipo/tamaño correctos y que el objeto existe en
el bucket (quickstart.md, Escenario 1).

### Tests for User Story 1 ⚠️ escribir primero, deben fallar antes de implementar

- [X] T008 [P] [US1] Test unitario nuevo en `tests/unit/agregarArchivoPaciente.test.ts`
  (no existía) — casos: resuelve `IMAGEN`/`PDF` por Content-Type, rechaza tipo no soportado
  sin tocar el repositorio, rechaza un archivo con `contenido.length > TAMANO_MAXIMO_ARCHIVO_BYTES`
  lanzando `ArchivoDemasiadoGrandeError` sin tocar el repositorio (FR-010) — mismo patrón que
  `tests/unit/agregarArchivoEstudio.test.ts`.
- [X] T009 [P] [US1] Agregar a `tests/unit/agregarArchivoEstudio.test.ts` el caso equivalente
  de rechazo por tamaño máximo (FR-010) — mismo repo falso ya definido en el archivo.
- [X] T010 [P] [US1] Test unitario nuevo en
  `tests/unit/infrastructure/ArchivoPacienteRepositoryPrisma.test.ts` — mockear tanto
  `@/infrastructure/db/prisma/client` como `@/infrastructure/storage/supabase/archivosStorage`;
  verificar que `agregar()` sube a Storage **antes** de insertar en Postgres, y que si el
  insert de Postgres falla después de un upload exitoso, se llama a `borrarArchivo` con la
  misma clave (compensación, research.md #3).
- [X] T011 [P] [US1] Test unitario nuevo en
  `tests/unit/infrastructure/ArchivoEstudioRepositoryPrisma.test.ts` — mismo caso que T010
  pero para `ArchivoEstudioRepositoryPrisma.agregar()`.
- [X] T012 [US1] Actualizar `tests/integration/archivos-estudio.test.ts`: agregar
  `vi.mock("@/infrastructure/storage/supabase/archivosStorage", ...)` junto al mock de
  Prisma existente (el `POST` ahora también sube a Storage); agregar un caso `422
  ARCHIVO_DEMASIADO_GRANDE` para un archivo que supere `TAMANO_MAXIMO_ARCHIVO_BYTES`.

### Implementation for User Story 1

- [X] T013 [US1] Modificar `agregarArchivoPaciente` en
  `src/application/use-cases/agregarArchivoPaciente.ts`: validar `contenido.length` contra
  `TAMANO_MAXIMO_ARCHIVO_BYTES` y lanzar `ArchivoDemasiadoGrandeError` antes de tocar el
  repositorio (depende de T002, T003, T008).
- [X] T014 [US1] Modificar `agregarArchivoEstudio` en
  `src/application/use-cases/agregarArchivoEstudio.ts`: mismo cambio que T013 (depende de
  T002, T003, T009).
- [X] T015 [US1] Reescribir `agregar()` en
  `src/infrastructure/db/prisma/ArchivoPacienteRepositoryPrisma.ts`: generar el `id` con
  `crypto.randomUUID()`, subir el contenido con `archivosStorage.subirArchivo(claveArchivoPaciente(pacienteId, id), ...)`,
  y solo si el upload confirma éxito, `prisma.archivoPaciente.create({ data: { id, ... } })`
  **sin** el campo `contenido`; si el `create` falla, llamar `borrarArchivo` con la misma
  clave antes de relanzar el error (research.md #3, depende de T004, T006, T010).
- [X] T016 [US1] Reescribir `agregar()` en
  `src/infrastructure/db/prisma/ArchivoEstudioRepositoryPrisma.ts`: mismo patrón que T015,
  usando `claveArchivoEstudio(citaId, estudioItemId, id)` (depende de T004, T006, T011).
- [X] T017 [US1] Mapear `ArchivoDemasiadoGrandeError` a `422 { error: "ARCHIVO_DEMASIADO_GRANDE" }`
  en `src/app/api/patients/[id]/archivos/route.ts` (`POST`) y en
  `src/app/api/citas/[id]/estudios/[estudioItemId]/archivos/route.ts` (`POST`) — mismo bloque
  `catch` donde ya se mapea `TipoArchivoNoSoportadoError` (depende de T013, T014).
- [X] T018 [US1] Correr `npx prisma generate` tras el cambio de schema de T006 antes de
  validar T015/T016 (el cliente tipado debe dejar de esperar el campo `contenido`).

**Checkpoint**: subir un archivo (paciente o estudio) queda en Storage, sin huérfanos en fallos
parciales, y el límite de tamaño se respeta.

---

## Phase 4: User Story 2 — Ver/descargar un archivo (Priority: P1)

**Goal**: abrir un archivo ya subido devuelve el contenido correcto, leído desde Storage.

**Independent Test**: con un archivo ya subido, pedir su contenido y confirmar que llegan los
mismos bytes con el Content-Type correcto (quickstart.md, Escenarios 1/5).

### Tests for User Story 2 ⚠️ escribir primero

- [X] T019 [P] [US2] Agregar a `tests/unit/infrastructure/ArchivoPacienteRepositoryPrisma.test.ts`
  (de T010) el caso de `obtenerContenido()`: lee la clave correcta desde
  `archivosStorage.leerArchivo`, y devuelve `null` sin llamar a Storage si el registro no
  existe o no pertenece a ese `pacienteId` (Principio VII — el corte debe pasar por Postgres
  primero, no filtrar contenido antes de validar pertenencia).
- [X] T020 [P] [US2] Mismo caso que T019 para
  `tests/unit/infrastructure/ArchivoEstudioRepositoryPrisma.test.ts` (de T011), validando
  pertenencia a `citaId`/`estudioItemId`.
- [X] T021 [US2] Agregar a `tests/integration/archivos-estudio.test.ts` un caso que verifique
  que el binario devuelto por el `GET` es exactamente el que se subió (byte a byte), no solo
  el status `200` que ya cubre el test existente.

### Implementation for User Story 2

- [X] T022 [US2] Reescribir `obtenerContenido()` en `ArchivoPacienteRepositoryPrisma.ts`:
  buscar la fila en Postgres primero (valida pertenencia igual que hoy), y si existe, leer el
  binario con `archivosStorage.leerArchivo(claveArchivoPaciente(pacienteId, archivoId))` en
  vez de devolver la columna `contenido` (depende de T004, T006, T019).
- [X] T023 [US2] Mismo cambio que T022 en `ArchivoEstudioRepositoryPrisma.obtenerContenido()`
  (depende de T004, T006, T020).
- [X] T024 [US2] Manejar el caso de fallo de Storage al leer (timeout/error de red) en ambos
  repositorios: no debe filtrarse como `404` (que implicaría "no existe") ni tumbar el
  proceso — la ruta API lo traduce a `502` (research.md #4). Confirmar que
  `src/app/api/patients/[id]/archivos/[archivoId]/route.ts` y
  `src/app/api/citas/[id]/estudios/[estudioItemId]/archivos/[archivoId]/route.ts` no
  necesitan cambio si el repositorio ya deja propagar el error tal cual (dependen de T022,
  T023).

**Checkpoint**: US1 + US2 juntas dejan el flujo completo subir→ver funcionando end-to-end
contra Supabase Storage.

---

## Phase 5: User Story 3 — Borrar un archivo (Priority: P2)

**Goal**: borrar un `ArchivoPaciente` elimina tanto la fila como el objeto en Storage, sin
dejar huérfanos.

**Independent Test**: borrar un archivo existente, confirmar que desaparece de la lista, que
una descarga posterior da `404`, y que el objeto ya no está en el bucket (quickstart.md,
Escenario 2).

### Tests for User Story 3 ⚠️ escribir primero

- [X] T025 [P] [US3] Agregar a `tests/unit/infrastructure/ArchivoPacienteRepositoryPrisma.test.ts`
  el caso de `eliminar()`: llama a `archivosStorage.borrarArchivo` con la clave correcta
  **antes** de borrar la fila en Postgres (research.md #3); si `borrarArchivo` falla, la fila
  NO se borra (queda recuperable/reintentable) y el error se propaga.

### Implementation for User Story 3

- [X] T026 [US3] Reescribir `eliminar()` en `ArchivoPacienteRepositoryPrisma.ts`: validar
  pertenencia (como hoy), borrar el objeto en Storage con
  `archivosStorage.borrarArchivo(claveArchivoPaciente(pacienteId, archivoId))`, y solo si
  eso confirma éxito, `prisma.archivoPaciente.delete(...)` (depende de T004, T006, T025).

**Checkpoint**: las tres historias funcionan de punta a punta contra Supabase Storage.

---

## Phase 6: Polish & Cross-Cutting

- [X] T027 [P] Revisar `tests/e2e/ficha-archivos.spec.ts` (Playwright) contra el entorno con
  Supabase real — confirma o ajusta según haga falta (por ejemplo, si el entorno de e2e usa
  una base/bucket de pruebas separados de desarrollo).
- [X] T028 Correr manualmente los 5 escenarios de `quickstart.md` de punta a punta (incluye
  verificar en el dashboard de Supabase que la columna `contenido` ya no existe y que no
  quedan objetos huérfanos tras un borrado).
- [X] T029 `npm run lint` y `npx tsc --noEmit` sobre todo el diff antes de dar la feature por
  terminada.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: sin dependencias — arrancar ya.
- **Foundational (Phase 2)**: depende de Phase 1 — bloquea TODAS las historias.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de Foundational — **no** depende de US1 en código (son
  repositorios distintos métodos), pero en la práctica conviene hacerla después porque
  comparten los mismos archivos de test/repositorio ya tocados por US1.
- **US3 (Phase 5)**: depende de Foundational; solo aplica a `ArchivoPaciente` (`ArchivoEstudio`
  no tiene borrado hoy, fuera de alcance — spec, User Story 3).
- **Polish (Phase 6)**: depende de que US1–US3 estén completas.

### Oportunidades de paralelismo

- T002/T003 en paralelo (archivos distintos).
- T008–T011 en paralelo entre sí (archivos de test distintos); todos antes que T013–T016.
- T019/T020 en paralelo entre sí.
- Los repositorios de Paciente y de Estudio (T015/T016, T022/T023) son archivos distintos y
  pueden implementarse en paralelo por personas distintas si hay más de un desarrollador.

## Implementation Strategy

**MVP** = Phase 1 + Phase 2 + Phase 3 (US1). Subir ya deja los archivos nuevos en Supabase
Storage; ver/borrar quedan como incrementos siguientes (Phase 4 y 5) sin romper lo ya
entregado.

---

## Notas de implementación (desvíos respecto a este plan)

Ejecutado el 2026-08-07. Todas las tareas completadas. Desvíos deliberados:

1. **Ubicación de los tests de repositorio**: el plan decía
   `tests/unit/infrastructure/ArchivoXRepositoryPrisma.test.ts`, pero `tests/unit/` del
   proyecto es plano (sin subcarpetas). Se siguió la convención existente:
   `tests/unit/ArchivoPacienteRepositoryPrisma.test.ts` y su par de Estudio.

2. **`tipoMime` agregado a `DatosNuevoArchivoPaciente`/`DatosNuevoArchivoEstudio`**: no estaba
   previsto. Hace falta para guardar el objeto en Storage con su Content-Type real — derivarlo
   de `tipo` (IMAGEN/PDF) habría obligado a adivinar por extensión, y un fallback
   `application/octet-stream` chocaría con el filtro de MIME del bucket.

3. **`allowedMimeTypes` del bucket = `["image/*", "application/pdf"]`**: primero se creó con
   una lista fija (jpeg/png/gif/webp), que habría rechazado imágenes que FR-001 sí acepta
   (p. ej. `image/bmp`). Se corrigió para que el bucket espeje exactamente el dominio.

4. **Mapeo a `502 ALMACENAMIENTO_NO_DISPONIBLE`** (research.md #4) implementado en los `GET`
   de ambas rutas y en el `DELETE` de paciente. El plan lo dejaba como "confirmar si hace
   falta" (T024): hacía falta, porque sin él un Storage caído se habría propagado como `500`.

5. **`tests/integration/migracion-plan-tratamiento.test.ts`**: timeout subido a 30s. Consulta
   la base real, que ahora es remota — la primera query paga la apertura de conexión contra el
   pooler y superaba los 5s por defecto de Vitest. No es un cambio de aserción.

6. **T007 aplicado por script** (`$executeRawUnsafe` sobre el pooler + registro en
   `_prisma_migrations` con checksum sha256 real), no con `prisma migrate deploy`: la VPN de
   esta máquina bloquea el puerto 5432 que ese comando necesita. Gate de research.md #5
   verificado antes: ambas tablas estaban vacías (0 filas).

7. **T028 automatizado**: en vez de recorrer `quickstart.md` a mano, se corrió un script de
   validación end-to-end contra Supabase real (sin mocks) que cubre subir → leer byte a byte →
   pertenencia ajena → rechazos FR-001/FR-010 → borrar sin huérfanos. 12/12 OK. Queda
   pendiente la validación visual en el navegador (la UI no se tocó, pero nadie la abrió).
