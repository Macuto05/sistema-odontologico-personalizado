# Implementation Plan: Atención de Paciente (Cita Clínica)

**Branch**: `005-atencion-paciente` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-atencion-paciente/spec.md`

## Summary

Agrega el flujo de "atender" a un paciente: un botón en su ficha crea (o reabre) una `Cita`
en curso y abre un panel de Atención con pestañas (Diagnóstico, Receta, Estudios
complementarios, Odontograma-placeholder) y un panel lateral colapsable con dos acordeones
(Antecedentes — reutiliza 100% la historia clínica de 003 — e Historial de citas
anteriores). `Cita` es una entidad nueva, local-first como `Paciente`/`Consultorio`, con
receta y nombres de estudios embebidos como JSON (mismo criterio de simplicidad que la
historia clínica de 003 — research.md #1, #2). "Finalizar atención" bloquea la edición de
esos campos (mismo mecanismo `version`/`conflictoPendiente` que `Paciente`, más un rechazo
explícito `CitaFinalizadaError` — research.md #7, #10). La única pieza genuinamente nueva en
la arquitectura es el adjunto de archivos a un estudio: una tabla `ArchivoEstudio` solo-
servidor (contenido en PostgreSQL `Bytes`), subida vía un endpoint online-only fuera del
outbox — mismo patrón ya usado por `Configuración`/`IUsuarioRepository` — porque el spec
decidió explícitamente que esa única acción puede requerir conexión (research.md #3, #4,
#5).

**Revisión posterior** (tras ver la UI funcionando): "Nueva cita" ya no crea la `Cita` de
inmediato — abre el panel de Atención en modo borrador (estado de React puro, sin tocar
Dexie) y recién al presionar "Finalizar atención" se ejecutan en secuencia
`crearOAbrirCita` → `editarCita` (con todo el borrador) → `finalizarCita`, los mismos tres
casos de uso ya descritos arriba, sin cambios de dominio/backend/API/sync — solo cambia
**cuándo** la UI los invoca (una vez al final, no incrementalmente por campo). Motivo: el
odontólogo pidió que nada quede a medio guardar ni se cree una Cita "huérfana" solo por
abrir el panel por error; se agregó un botón "Volver a la ficha" que descarta el borrador
sin persistir nada. Antecedentes es la única excepción — sigue llamando a `editarPaciente`
de inmediato, porque es un dato del paciente, no del borrador de la Cita. Riesgo aceptado
explícitamente (documentado en spec.md §Assumptions): cerrar la pestaña antes de finalizar
pierde el borrador — ya no hay "cita en curso" que retomar.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+ (sin cambios respecto a features
previas)

**Primary Dependencies**: Next.js 15 (App Router), Prisma ORM, Dexie.js, Auth.js, Zod — las
mismas ya ratificadas; no se agrega ninguna dependencia nueva de paquete (la subida de
archivos usa `FormData`/`Request` nativos de Next.js, sin librería de upload adicional).

**Storage**: PostgreSQL (servidor) + IndexedDB vía Dexie.js (cliente), igual que el resto
del sistema — con una excepción: el contenido binario de `ArchivoEstudio` vive únicamente en
PostgreSQL (columna `Bytes`), nunca en IndexedDB (research.md #3, #4, #14).

**Testing**: Vitest (unit + integration), Playwright (e2e) — mismas herramientas que
features previas.

**Target Platform**: Web (PWA), responsive en celular/tablet/escritorio — el panel de
Atención es una pantalla nueva sujeta al mismo mínimo de Principio VI que el resto.

**Project Type**: Aplicación web (mismo codebase Next.js único; esta feature no agrega
proyectos ni servicios nuevos).

**Performance Goals**: Lecturas/escrituras de texto (diagnóstico, receta, estudios,
antecedentes) contra Dexie local, sin esperar red — igual que el resto del sistema. El
historial de citas anteriores usa una consulta indexada `(pacienteId, estado)` que no trae
`recetaItems`/`estudioItems` completos ni archivos si la lista no los muestra
(research.md #13, Principio VIII).

**Constraints**: Todo el flujo de atención (crear/reabrir cita, diagnóstico, receta,
estudios sin adjuntos, antecedentes, historial) DEBE funcionar completamente offline, igual
que el resto del sistema. Única excepción documentada: adjuntar o ver el contenido de un
archivo de un estudio requiere conexión (FR-019, research.md #5, #14) — desviación acotada
y justificada, ver Complexity Tracking.

**Scale/Scope**: Mismo alcance de usuario único que el resto del sistema. A diferencia de
`Consultorio` (lista corta, pull completo), `Cita` crece sin límite a lo largo de los años de
un consultorio — su pull sigue el mismo patrón incremental por `updatedAt` que ya usa
`Paciente` (research.md #12 de 003), no el "traer todo siempre" de `Consultorio`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento planeado |
|---|---|
| I. Test-First | Vitest para la entidad `Cita` (transiciones de estado, `puedeEditarseCita`), los casos de uso (`crearOAbrirCita`, `editarCita`, `finalizarCita`, `agregarArchivoEstudio`) y la validación Zod de `recetaItems`/`estudioItems`; Playwright para las 8 user stories del spec, escritos antes de tocar la implementación de cada una. |
| II. Arquitectura en capas | `Cita`/`ArchivoEstudio` viven en `src/domain/entities/`, sin dependencias de framework; `ICitaRepository`/`IArchivoEstudioRepository` son los puertos; `CitaRepositoryPrisma`/`CitaRepositoryDexie` implementan el primero (local-first, igual que `Paciente`), `ArchivoEstudioRepositoryPrisma` implementa el segundo sin contraparte Dexie (online-only, mismo patrón que `IUsuarioRepository` — research.md #5). Los casos de uso en `application/use-cases` no conocen Prisma, Dexie ni `fetch` directamente. |
| III. Integridad y auditoría de datos | Una `Cita` finalizada es inmutable salvo adjuntar archivos (FR-015 a FR-017) — nunca se sobrescribe silenciosamente un diagnóstico o receta ya cerrados; el rechazo `CitaFinalizadaError` aplica tanto si la edición llega por la UI como por una operación de outbox vieja que se sincroniza tarde (research.md #10). Conflictos de edición entre dispositivos usan el mismo mecanismo `version`/`conflictoPendiente` ya auditado de `Paciente` (research.md #7) — ninguna edición concurrente se descarta en silencio. |
| IV. Control de acceso por rol | Todas las rutas nuevas (`/api/patients/:id/citas`, `/api/citas/*`, incluidas las de archivos) quedan protegidas por el mismo middleware/sesión Auth.js que el resto de `/api/*` — sin rutas públicas nuevas. |
| V. Simplicidad y YAGNI | Se descartaron tablas relacionales separadas para `ItemReceta`/`EstudioComplementario` (research.md #2) por no haber caso de uso que requiera consultarlos fuera de su Cita — se embeben como JSON, mismo criterio que la historia clínica de 003. El almacenamiento de archivos usa la base de datos ya ratificada (Postgres `Bytes`) en vez de agregar un servicio de almacenamiento de objetos nuevo, proporcional al volumen esperado de un solo consultorio (research.md #4) — una migración futura acotada si el volumen lo justifica, no resuelta especulativamente ahora. El panel lateral responsive reutiliza `Modal` en vez de construir un `Drawer` nuevo (research.md #11). |
| VI. Consistencia de UI, responsive y design system | Se agregan `Accordion` y `FileInput` a `src/components/ui/`, documentados como extensión de `docs/design-system.md` antes de usarse — reutilizan los tokens ya existentes (borde, foco, error, radio). El panel de Atención reutiliza `Tabs` (§6.10) tal cual, sin modificarlo. Responsive: tabs + acordeón lateral en desktop/tablet (≥640px); en mobile (<640px) el panel lateral se abre como `Modal` a pantalla completa, comportamiento que `Modal` ya tiene resuelto (§6.4) — FR-025. |
| VII. Seguridad y prevención de vulnerabilidades | Prisma parametriza todo acceso nuevo, incluida la columna `Bytes`. La descarga de un archivo (`GET /api/citas/:citaId/estudios/:estudioItemId/archivos/:archivoId`) valida que el archivo pertenezca exactamente a esa Cita y ese Estudio antes de devolverlo — no solo que el usuario esté autenticado (Principio VII, control a nivel de registro, no solo de rol; research.md #10 aplica el mismo criterio a la edición de una Cita finalizada). El tipo de archivo se valida por contenido MIME, no solo por extensión (FR-018). |
| VIII. Rendimiento y acceso eficiente a datos | El listado del historial de citas (`GET /api/patients/:id/citas`) no incluye el `contenido` binario de ningún `ArchivoEstudio` — solo su metadata (research.md #3, #13); el contenido se trae únicamente en la descarga puntual de un archivo. El pull incremental de `Cita` sigue el mismo patrón por `updatedAt`/paginado que `Paciente` (no el pull completo de `Consultorio`, impropio para una entidad que crece sin límite). |

**Resultado (pre-diseño)**: una desviación identificada y justificada (adjuntar/ver un
archivo de estudio requiere conexión, contra la garantía general de "local-first, la UI
nunca espera a la red") — ver Complexity Tracking. El resto del diseño no presenta
violaciones.

**Re-chequeo post-Fase 1** (tras `data-model.md`, `contracts/`, `quickstart.md`): el diseño
resultante no introduce violaciones nuevas ni adicionales a la ya documentada.
- `data-model.md` confirma que `ArchivoEstudio` es la única tabla sin espejo en Dexie de
  toda la feature — el resto (`Cita` con `recetaItems`/`estudioItems` embebidos) sigue el
  patrón local-first estándar.
- `contracts/citas-api.md` no agrega ningún rol ni permiso nuevo — mismas rutas
  `/api/*` protegidas por el middleware existente.
- `contracts/archivos-estudio-api.md` documenta explícitamente el control de acceso a nivel
  de registro (Cita + Estudio + Archivo deben coincidir los tres) exigido por Principio VII.

Sin violaciones adicionales. Complexity Tracking documenta la única desviación, ya conocida
desde la Fase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-atencion-paciente/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan)
├── quickstart.md         # Fase 1 (/speckit-plan)
├── contracts/            # Fase 1 (/speckit-plan)
│   ├── citas-api.md
│   └── archivos-estudio-api.md
└── tasks.md              # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/
│   │   ├── Cita.ts                            # NUEVO — Cita, ItemReceta, EstudioItem,
│   │   │                                       #   ArchivoEstudioMeta, CategoriaConsulta,
│   │   │                                       #   EstadoCita, crearCitaDesdeDatos(),
│   │   │                                       #   puedeEditarseCita()
│   │   └── ArchivoEstudio.ts                   # NUEVO — entidad solo-servidor (con `contenido`)
│   ├── repositories/
│   │   ├── ICitaRepository.ts                  # NUEVO (puerto) — crearOAbrir, obtenerPorId,
│   │   │                                       #   listarPorPaciente, editar, finalizar
│   │   └── IArchivoEstudioRepository.ts        # NUEVO (puerto) — agregar, obtenerContenido
│   └── errors.ts                               # MODIFICADO — + CitaFinalizadaError,
│                                                #   EstudioNoEncontradoError,
│                                                #   TipoArchivoNoSoportadoError
│
├── application/
│   ├── use-cases/
│   │   ├── crearOAbrirCita.ts                  # NUEVO (US1)
│   │   ├── editarCita.ts                       # NUEVO (US2, US3, US4)
│   │   ├── finalizarCita.ts                    # NUEVO (US6)
│   │   ├── listarCitasPaciente.ts              # NUEVO (US7, historial)
│   │   └── agregarArchivoEstudio.ts            # NUEVO (US8)
│   └── dto/
│       ├── citaDto.ts                          # NUEVO — schemas Zod: crearCitaInputSchema,
│       │                                       #   editarCitaInputSchema, itemRecetaSchema,
│       │                                       #   estudioItemSchema, categoriaConsultaSchema
│       └── syncDto.ts                          # MODIFICADO — agrega OperacionSyncCita
│
├── infrastructure/
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── CitaRepositoryPrisma.ts         # NUEVO
│   │   │   └── ArchivoEstudioRepositoryPrisma.ts  # NUEVO
│   │   └── dexie/
│   │       ├── db.ts                           # MODIFICADO — this.version(5): tabla `citas`
│   │       │                                   #   (`id, pacienteId, [pacienteId+estado], estado`),
│   │       │                                   #   `EntidadOutbox` + `"CITA"`
│   │       └── CitaRepositoryDexie.ts          # NUEVO
│   └── sync/
│       ├── outboxQueue.ts                      # Sin cambios de lógica — ya genérico (research.md #8)
│       └── syncEngine.ts                       # MODIFICADO — + pullCitasDesdeServidor
│                                                #   (incremental, igual criterio que Paciente),
│                                                #   dispatch de resultados `cita` en sincronizarLote
│
└── app/
    ├── (shell)/
    │   ├── pacientes/[id]/page.tsx              # MODIFICADO — botón "Nueva cita" / "Atender
    │   │                                        #   paciente" en CardFooter (FR-001), navega a
    │   │                                        #   /citas/[citaId]
    │   └── citas/[id]/page.tsx                  # NUEVO — panel de Atención (shell de Tabs +
    │                                            #   Accordion lateral)
    └── api/
        ├── patients/[id]/citas/route.ts         # NUEVO — GET (historial + pull incremental)
        ├── citas/[id]/route.ts                  # NUEVO — GET (detalle)
        ├── citas/[id]/estudios/[estudioItemId]/archivos/route.ts
        │                                        # NUEVO — POST (subir, online-only)
        ├── citas/[id]/estudios/[estudioItemId]/archivos/[archivoId]/route.ts
        │                                        # NUEVO — GET (descargar, online-only)
        └── sync/route.ts                        # MODIFICADO — + aplicarOperacionCita,
                                                   #   dispatch por `entidad === "CITA"`

src/components/
├── ui/
│   ├── Accordion.tsx / .module.css              # NUEVO — §6.13 design-system.md, extensión
│   └── FileInput.tsx / .module.css              # NUEVO — §6.13 design-system.md, extensión
├── pacientes/
│   └── categoriaConsultaOpciones.ts             # NUEVO — catálogo de 10 opciones + labels
└── citas/
    ├── PanelAtencion.tsx                        # NUEVO — shell: Tabs central + Accordion lateral
    ├── DiagnosticoTab.tsx                       # NUEVO (US2)
    ├── RecetaTab.tsx                            # NUEVO (US3)
    ├── EstudiosTab.tsx                          # NUEVO (US4, incluye FileInput por estudio)
    ├── OdontogramaTab.tsx                       # NUEVO — placeholder deshabilitado (FR-013)
    ├── AntecedentesPanel.tsx                    # NUEVO (US5) — reutiliza Checkbox/Textarea/
    │                                            #   antecedentesPatologicosOpciones ya
    │                                            #   existentes; llama a editarPaciente
    ├── HistorialCitasPanel.tsx                  # NUEVO (US7) — lista + abre CitaDetalleSoloLectura
    └── CitaDetalleSoloLectura.tsx                # NUEVO (US7) — vista de una cita finalizada

prisma/schema.prisma                              # MODIFICADO — + enum EstadoCita,
                                                   #   CategoriaConsulta, TipoArchivoEstudio;
                                                   #   + modelo Cita (con recetaItems/estudioItems
                                                   #   Json); + modelo ArchivoEstudio

docs/design-system.md                             # MODIFICADO — documentar Accordion y
                                                   #   FileInput (§6.13), + variante de pantalla
                                                   #   "Panel de Atención" (tabs + acordeón lateral)

tests/
├── unit/           # + Cita: entidad, casos de uso, ambos repositorios, outbox extendido a CITA
├── integration/    # + /api/patients/:id/citas, /api/citas/*, /api/sync con operaciones CITA,
│                   #   /api/citas/.../archivos (subida y descarga, incluido tipo no soportado)
└── e2e/            # + los 8 escenarios de quickstart.md
```

**Structure Decision**: Mismo proyecto Next.js único. `Cita` sigue la misma separación en
capas que `Paciente`/`Consultorio` (`domain` → `application` → `infrastructure` →
`presentación`), con implementaciones paralelas Prisma/Dexie para todo lo que es
local-first. `ArchivoEstudio` es la única pieza de esta feature que rompe ese paralelismo a
propósito (research.md #3, #5): solo tiene implementación Prisma, sin Dexie, porque el spec
decidió explícitamente que esa operación no necesita ser local-first. El panel de Atención
vive en su propia carpeta `src/components/citas/`, separada de `src/components/pacientes/`,
porque aunque se abre desde la ficha del paciente, es una pantalla propia con su propia
navegación (`/citas/[id]`), no una sub-vista de la ficha.

## Complexity Tracking

> Única desviación de un principio/restricción de la constitución en esta feature — el
> resto de la Constitution Check no presenta violaciones.

| Violación | Por qué es necesaria | Alternativa más simple descartada porque |
|-----------|------------|-------------------------------------|
| Adjuntar (y ver) un archivo de estudio requiere conexión a internet — contradice la garantía general de Technology & Architecture Constraints de que "la UI nunca espera a la red para un read o un write". | El caso real (spec, discutido con el odontólogo): el paciente envía el resultado de un estudio (ej. una radiografía) días después de la consulta; cargarlo mientras se recibe no es un flujo que necesite funcionar sin conexión — a diferencia de cargar diagnóstico/receta/estudios durante la consulta en sí, que sí debe funcionar offline y funciona (FR-020). | Sincronizar archivos binarios pesados a través del mismo outbox que hoy solo transporta texto liviano es una complejidad de sincronización genuinamente distinta (colas de reintento con límite de tamaño, particionado de archivos grandes, cuota de almacenamiento del navegador) sin un caso de uso que la exija todavía — se evaluó explícitamente con el odontólogo (spec Assumptions) y se decidió no resolverla especulativamente en esta feature. |
